"""NeoStills domain — rename tables, add distillery/distillation columns

Revision ID: 002
Revises: 001
Create Date: 2025-04-20 00:00:00.000000

Cambios:
  - breweries       → distilleries  (+still_type, still_capacity_liters, usage_type, space_dimensions)
  - brewery_members → distillery_members
  - brew_sessions   → distillation_runs  (+wash/cuts/ABV columns, new phases)
  - ingredients.category  → new distillery enum values
  - recipes         → distillation-focused (+spirit_type, distillation_method, cut_points, cereals, botanicals…)
  - ai_conversations: brewery_id → distillery_id
  - purchases: brewery_id → distillery_id
  - price_alerts: brewery_id → distillery_id
  - fermentation_data: session_id → FK distillation_runs
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "002"
down_revision = "001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ─── 1. Nuevos enums ──────────────────────────────────────────────────────
    for stmt in [
        "DO $$ BEGIN CREATE TYPE still_type_enum AS ENUM ('pot_still','column_still','reflux_still','alembic','other'); EXCEPTION WHEN duplicate_object THEN NULL; END $$",
        "DO $$ BEGIN CREATE TYPE usage_type_enum AS ENUM ('home','professional'); EXCEPTION WHEN duplicate_object THEN NULL; END $$",
        "DO $$ BEGIN CREATE TYPE distillation_method_enum AS ENUM ('pot_still','column_still','reflux_still','alembic'); EXCEPTION WHEN duplicate_object THEN NULL; END $$",
        # Nueva ingredient_category_enum con terminología destilería
        "DO $$ BEGIN CREATE TYPE ingredient_category_enum_new AS ENUM ('cereal_base','cereal_especial','fruta','botanico','levadura','azucar','agua_quimica','adjunto','otro'); EXCEPTION WHEN duplicate_object THEN NULL; END $$",
        # Nuevas fases de destilación (extendemos session_phase_enum con ALTER TYPE ... ADD VALUE)
    ]:
        op.execute(stmt)

    # Agregar nuevos valores a session_phase_enum (ADD VALUE es idempotente desde PG 12 IF NOT EXISTS)
    for value in ("stripping_run", "spirit_run", "cuts_collection", "aging", "bottling"):
        op.execute(
            f"ALTER TYPE session_phase_enum ADD VALUE IF NOT EXISTS '{value}'"
        )

    # ─── 2. Renombrar tabla breweries → distilleries ──────────────────────────
    op.rename_table("breweries", "distilleries")

    # Renombrar columnas heredadas y agregar nuevas
    op.alter_column("distilleries", "name",
                    existing_type=sa.String(100),
                    type_=sa.String(200),
                    existing_nullable=False)

    # Agregar columnas nuevas a distilleries
    op.add_column("distilleries", sa.Column(
        "still_type",
        postgresql.ENUM("pot_still", "column_still", "reflux_still", "alembic", "other",
                        name="still_type_enum", create_type=False),
        nullable=True
    ))
    op.add_column("distilleries", sa.Column(
        "still_capacity_liters", sa.Float(), nullable=True
    ))
    op.add_column("distilleries", sa.Column(
        "usage_type",
        postgresql.ENUM("home", "professional", name="usage_type_enum", create_type=False),
        nullable=False,
        server_default="home"
    ))
    op.add_column("distilleries", sa.Column(
        "space_dimensions", postgresql.JSONB(), nullable=True
    ))
    op.add_column("distilleries", sa.Column(
        "location", sa.String(200), nullable=True
    ))
    op.add_column("distilleries", sa.Column(
        "logo_url", sa.String(500), nullable=True
    ))

    # Slug ya no es necesario (owner_id es único), hacerlo nullable o dropear
    # Lo dejamos nullable para retro-compat
    op.alter_column("distilleries", "slug",
                    existing_type=sa.String(100),
                    nullable=True)

    # ─── 3. Actualizar índices distilleries ───────────────────────────────────
    op.drop_index("ix_breweries_owner_id", table_name="distilleries")
    op.create_index("ix_distilleries_owner_id", "distilleries", ["owner_id"])

    # ─── 4. Renombrar brewery_members → distillery_members ───────────────────
    op.rename_table("brewery_members", "distillery_members")
    op.drop_constraint("brewery_members_brewery_id_fkey", "distillery_members", type_="foreignkey")
    op.create_foreign_key(
        "distillery_members_distillery_id_fkey",
        "distillery_members", "distilleries",
        ["brewery_id"], ["id"], ondelete="CASCADE"
    )
    op.alter_column("distillery_members", "brewery_id",
                    new_column_name="distillery_id",
                    existing_type=sa.Integer(),
                    existing_nullable=False)

    # ─── 5. Actualizar FK en ingredients → distilleries ──────────────────────
    op.drop_constraint("ingredients_brewery_id_fkey", "ingredients", type_="foreignkey")
    op.alter_column("ingredients", "brewery_id",
                    new_column_name="distillery_id",
                    existing_type=sa.Integer(),
                    existing_nullable=False)
    op.create_foreign_key(
        "ingredients_distillery_id_fkey",
        "ingredients", "distilleries",
        ["distillery_id"], ["id"], ondelete="CASCADE"
    )

    # Migrar enum de categorías (ingredient_category_enum → ingredient_category_enum_new)
    op.execute("""
        ALTER TABLE ingredients
          ALTER COLUMN category TYPE ingredient_category_enum_new
          USING CASE
            WHEN category::text IN ('malt')       THEN 'cereal_base'::ingredient_category_enum_new
            WHEN category::text IN ('hop')        THEN 'botanico'::ingredient_category_enum_new
            WHEN category::text IN ('yeast')      THEN 'levadura'::ingredient_category_enum_new
            WHEN category::text IN ('adjunct')    THEN 'adjunto'::ingredient_category_enum_new
            WHEN category::text IN ('water_chemical') THEN 'agua_quimica'::ingredient_category_enum_new
            ELSE 'otro'::ingredient_category_enum_new
          END
    """)
    op.execute("DROP TYPE ingredient_category_enum")
    op.execute("ALTER TYPE ingredient_category_enum_new RENAME TO ingredient_category_enum")

    # ─── 6. Actualizar FK en purchases → distilleries ────────────────────────
    op.drop_constraint("purchases_brewery_id_fkey", "purchases", type_="foreignkey")
    op.alter_column("purchases", "brewery_id",
                    new_column_name="distillery_id",
                    existing_type=sa.Integer(),
                    existing_nullable=False)
    op.create_foreign_key(
        "purchases_distillery_id_fkey",
        "purchases", "distilleries",
        ["distillery_id"], ["id"], ondelete="CASCADE"
    )

    # ─── 7. Actualizar FK en ai_conversations → distilleries ─────────────────
    op.drop_constraint("ai_conversations_brewery_id_fkey", "ai_conversations", type_="foreignkey")
    op.alter_column("ai_conversations", "brewery_id",
                    new_column_name="distillery_id",
                    existing_type=sa.Integer(),
                    existing_nullable=False)
    op.create_foreign_key(
        "ai_conversations_distillery_id_fkey",
        "ai_conversations", "distilleries",
        ["distillery_id"], ["id"], ondelete="CASCADE"
    )

    # ─── 8. Actualizar FK en price_alerts → distilleries ─────────────────────
    op.drop_constraint("price_alerts_brewery_id_fkey", "price_alerts", type_="foreignkey")
    op.alter_column("price_alerts", "brewery_id",
                    new_column_name="distillery_id",
                    existing_type=sa.Integer(),
                    existing_nullable=False)
    op.create_foreign_key(
        "price_alerts_distillery_id_fkey",
        "price_alerts", "distilleries",
        ["distillery_id"], ["id"], ondelete="CASCADE"
    )

    # ─── 9. Actualizar recipes → distillation-focused ────────────────────────
    op.drop_constraint("recipes_brewery_id_fkey", "recipes", type_="foreignkey")
    op.alter_column("recipes", "brewery_id",
                    new_column_name="distillery_id",
                    existing_type=sa.Integer(),
                    existing_nullable=False)
    op.create_foreign_key(
        "recipes_distillery_id_fkey",
        "recipes", "distilleries",
        ["distillery_id"], ["id"], ondelete="CASCADE"
    )

    # Agregar nuevas columnas de destilación a recipes
    op.add_column("recipes", sa.Column("spirit_type", sa.String(100), nullable=True))
    op.add_column("recipes", sa.Column(
        "distillation_method",
        postgresql.ENUM("pot_still", "column_still", "reflux_still", "alembic",
                        name="distillation_method_enum", create_type=False),
        nullable=True
    ))
    op.add_column("recipes", sa.Column("stripping_run_enabled", sa.Boolean(), nullable=False, server_default="false"))
    op.add_column("recipes", sa.Column("wash_volume_liters", sa.Float(), nullable=True))
    op.add_column("recipes", sa.Column("fermentation_tank_capacity_liters", sa.Float(), nullable=True))
    op.add_column("recipes", sa.Column("fruit_brix", sa.Float(), nullable=True))
    op.add_column("recipes", sa.Column("wash_abv", sa.Float(), nullable=True))
    op.add_column("recipes", sa.Column("target_abv", sa.Float(), nullable=True))
    op.add_column("recipes", sa.Column("spirit_yield_liters", sa.Float(), nullable=True))
    op.add_column("recipes", sa.Column("cut_points", postgresql.JSONB(), nullable=True))
    op.add_column("recipes", sa.Column("cereals", postgresql.JSONB(), nullable=True))
    op.add_column("recipes", sa.Column("botanicals", postgresql.JSONB(), nullable=True))
    op.add_column("recipes", sa.Column("fermentation_yeasts", postgresql.JSONB(), nullable=True))

    # ─── 10. Renombrar brew_sessions → distillation_runs ─────────────────────
    op.rename_table("brew_sessions", "distillation_runs")

    # Actualizar FK en distillation_runs → distilleries
    op.drop_constraint("brew_sessions_brewery_id_fkey", "distillation_runs", type_="foreignkey")
    op.alter_column("distillation_runs", "brewery_id",
                    new_column_name="distillery_id",
                    existing_type=sa.Integer(),
                    existing_nullable=False)
    op.create_foreign_key(
        "distillation_runs_distillery_id_fkey",
        "distillation_runs", "distilleries",
        ["distillery_id"], ["id"], ondelete="CASCADE"
    )

    # Agregar columnas distillation_runs
    op.add_column("distillation_runs", sa.Column("still_type", sa.String(50), nullable=True))
    op.add_column("distillation_runs", sa.Column("wash_volume_liters", sa.Float(), nullable=True))
    op.add_column("distillation_runs", sa.Column("actual_wash_liters", sa.Float(), nullable=True))
    op.add_column("distillation_runs", sa.Column("wash_abv", sa.Float(), nullable=True))
    op.add_column("distillation_runs", sa.Column("target_abv", sa.Float(), nullable=True))
    op.add_column("distillation_runs", sa.Column("wash_yield_pct", sa.Float(), nullable=True))
    op.add_column("distillation_runs", sa.Column("spirit_volume_liters", sa.Float(), nullable=True))
    op.add_column("distillation_runs", sa.Column(
        "stripping_run_enabled", sa.Boolean(), nullable=False, server_default="false"
    ))
    op.add_column("distillation_runs", sa.Column("heads_liters", sa.Float(), nullable=True))
    op.add_column("distillation_runs", sa.Column("hearts_liters", sa.Float(), nullable=True))
    op.add_column("distillation_runs", sa.Column("tails_liters", sa.Float(), nullable=True))
    op.add_column("distillation_runs", sa.Column("cut_temperature_heads", sa.Float(), nullable=True))
    op.add_column("distillation_runs", sa.Column("cut_temperature_tails", sa.Float(), nullable=True))
    op.add_column("distillation_runs", sa.Column(
        "wash_date", sa.DateTime(timezone=True), nullable=True
    ))
    op.add_column("distillation_runs", sa.Column(
        "distillation_date", sa.DateTime(timezone=True), nullable=True
    ))
    op.add_column("distillation_runs", sa.Column(
        "bottling_date", sa.DateTime(timezone=True), nullable=True
    ))

    # ─── 11. Actualizar fermentation_data → FK distillation_runs ─────────────
    op.drop_constraint("fermentation_data_session_id_fkey", "fermentation_data", type_="foreignkey")
    op.create_foreign_key(
        "fermentation_data_session_id_fkey",
        "fermentation_data", "distillation_runs",
        ["session_id"], ["id"], ondelete="CASCADE"
    )


def downgrade() -> None:
    # Revertir FK fermentation_data
    op.drop_constraint("fermentation_data_session_id_fkey", "fermentation_data", type_="foreignkey")
    op.create_foreign_key(
        "fermentation_data_session_id_fkey",
        "fermentation_data", "brew_sessions",
        ["session_id"], ["id"], ondelete="CASCADE"
    )

    # Revertir distillation_runs → brew_sessions
    for col in ["still_type", "wash_volume_liters", "actual_wash_liters", "wash_abv",
                "target_abv", "wash_yield_pct", "spirit_volume_liters", "stripping_run_enabled",
                "heads_liters", "hearts_liters", "tails_liters", "cut_temperature_heads",
                "cut_temperature_tails", "wash_date", "distillation_date", "bottling_date"]:
        op.drop_column("distillation_runs", col)

    op.drop_constraint("distillation_runs_distillery_id_fkey", "distillation_runs", type_="foreignkey")
    op.alter_column("distillation_runs", "distillery_id",
                    new_column_name="brewery_id",
                    existing_type=sa.Integer())
    op.create_foreign_key(
        "brew_sessions_brewery_id_fkey",
        "distillation_runs", "breweries",
        ["brewery_id"], ["id"], ondelete="CASCADE"
    )
    op.rename_table("distillation_runs", "brew_sessions")

    # Revertir recipes
    for col in ["spirit_type", "distillation_method", "stripping_run_enabled",
                "wash_volume_liters", "fermentation_tank_capacity_liters", "fruit_brix",
                "wash_abv", "target_abv", "spirit_yield_liters",
                "cut_points", "cereals", "botanicals", "fermentation_yeasts"]:
        op.drop_column("recipes", col)

    op.drop_constraint("recipes_distillery_id_fkey", "recipes", type_="foreignkey")
    op.alter_column("recipes", "distillery_id", new_column_name="brewery_id", existing_type=sa.Integer())
    op.create_foreign_key("recipes_brewery_id_fkey", "recipes", "breweries", ["brewery_id"], ["id"], ondelete="CASCADE")

    # Revertir price_alerts
    op.drop_constraint("price_alerts_distillery_id_fkey", "price_alerts", type_="foreignkey")
    op.alter_column("price_alerts", "distillery_id", new_column_name="brewery_id", existing_type=sa.Integer())
    op.create_foreign_key("price_alerts_brewery_id_fkey", "price_alerts", "breweries", ["brewery_id"], ["id"], ondelete="CASCADE")

    # Revertir ai_conversations
    op.drop_constraint("ai_conversations_distillery_id_fkey", "ai_conversations", type_="foreignkey")
    op.alter_column("ai_conversations", "distillery_id", new_column_name="brewery_id", existing_type=sa.Integer())
    op.create_foreign_key("ai_conversations_brewery_id_fkey", "ai_conversations", "breweries", ["brewery_id"], ["id"], ondelete="CASCADE")

    # Revertir purchases
    op.drop_constraint("purchases_distillery_id_fkey", "purchases", type_="foreignkey")
    op.alter_column("purchases", "distillery_id", new_column_name="brewery_id", existing_type=sa.Integer())
    op.create_foreign_key("purchases_brewery_id_fkey", "purchases", "breweries", ["brewery_id"], ["id"], ondelete="CASCADE")

    # Revertir ingredients
    op.drop_constraint("ingredients_distillery_id_fkey", "ingredients", type_="foreignkey")
    op.alter_column("ingredients", "distillery_id", new_column_name="brewery_id", existing_type=sa.Integer())
    op.create_foreign_key("ingredients_brewery_id_fkey", "ingredients", "breweries", ["brewery_id"], ["id"], ondelete="CASCADE")

    # Revertir distillery_members
    op.alter_column("distillery_members", "distillery_id", new_column_name="brewery_id", existing_type=sa.Integer())
    op.drop_constraint("distillery_members_distillery_id_fkey", "distillery_members", type_="foreignkey")
    op.create_foreign_key("brewery_members_brewery_id_fkey", "distillery_members", "breweries", ["brewery_id"], ["id"], ondelete="CASCADE")
    op.rename_table("distillery_members", "brewery_members")

    # Revertir distilleries → breweries
    op.drop_index("ix_distilleries_owner_id", table_name="distilleries")
    for col in ["still_type", "still_capacity_liters", "usage_type", "space_dimensions", "location", "logo_url"]:
        op.drop_column("distilleries", col)
    op.rename_table("distilleries", "breweries")
    op.create_index("ix_breweries_owner_id", "breweries", ["owner_id"])

    # Drop nuevos enums
    op.execute("DROP TYPE IF EXISTS distillation_method_enum")
    op.execute("DROP TYPE IF EXISTS usage_type_enum")
    op.execute("DROP TYPE IF EXISTS still_type_enum")
