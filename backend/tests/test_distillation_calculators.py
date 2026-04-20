"""Tests para distillation_calculators — NeoStills v2."""
import pytest
import sys
import os

# Asegurar que backend/app esta en PYTHONPATH
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.services.distillation_calculators import (
    calculate_dilution,
    calculate_wash_abv,
    calculate_fermentation_yield,
    estimate_cuts,
    get_mash_profile,
    CutPoints,
    FERMENTABLE_DATABASE,
    MASH_PROFILES,
)


class TestCalculateDilution:
    def test_dilution_basica(self):
        r = calculate_dilution(80.0, 1.0, 40.0)
        assert r["water_to_add_liters"] == pytest.approx(1.0, abs=0.01)
        assert r["final_volume_liters"] == pytest.approx(2.0, abs=0.01)

    def test_dilution_a_40_grados(self):
        """Whisky a 40% ABV"""
        r = calculate_dilution(65.0, 5.0, 40.0)
        expected_final = (65.0 * 5.0) / 40.0
        assert r["final_volume_liters"] == pytest.approx(expected_final, abs=0.01)
        assert r["water_to_add_liters"] == pytest.approx(expected_final - 5.0, abs=0.01)

    def test_dilution_invalid_target_mayor_que_inicial(self):
        with pytest.raises(ValueError):
            calculate_dilution(40.0, 1.0, 65.0)

    def test_dilution_invalid_volumen_negativo(self):
        with pytest.raises(ValueError):
            calculate_dilution(80.0, -1.0, 40.0)


class TestCalculateWashAbv:
    def test_wash_abv_tipico(self):
        abv = calculate_wash_abv(1.080, 1.010)
        assert abv == pytest.approx(9.19, abs=0.1)

    def test_wash_abv_ron_alta_gravedad(self):
        abv = calculate_wash_abv(1.120, 1.020)
        assert abv == pytest.approx(13.125, abs=0.2)

    def test_fg_mayor_que_og_error(self):
        with pytest.raises(ValueError):
            calculate_wash_abv(1.010, 1.080)

    def test_og_fuera_de_rango(self):
        with pytest.raises(ValueError):
            calculate_wash_abv(1.300, 1.010)


class TestCalculateFermentationYield:
    def test_maiz_bourbon(self):
        r = calculate_fermentation_yield("maiz", 10.0, 30.0)
        assert "estimated_wash_abv_pct" in r
        assert r["estimated_wash_abv_pct"] > 0

    def test_melaza_ron(self):
        r = calculate_fermentation_yield("melaza", 5.0, 20.0)
        assert r["fermentable"] == "Melaza de cana (ron)"
        assert r["ethanol_liters"] > 0

    def test_uva_brandy_con_brix(self):
        r = calculate_fermentation_yield("uva", 20.0, 15.0, custom_brix=18.0)
        assert r["sugar_pct_used"] == pytest.approx(18.0, abs=0.5)

    def test_fermentable_desconocido(self):
        with pytest.raises(ValueError, match="no reconocido"):
            calculate_fermentation_yield("patata", 10.0, 30.0)


class TestEstimateCuts:
    def test_cortes_wash_tipico(self):
        r = estimate_cuts(100.0, 8.0)
        assert r["heads_liters"] > 0
        assert r["hearts_liters"] > 0
        assert r["tails_liters"] > 0
        # Corazones deben ser el mayor volumen
        assert r["hearts_liters"] > r["heads_liters"]
        assert "safety_note" in r

    def test_cortes_custom_cut_points(self):
        cp = CutPoints(
            heads_end_temp_c=80.0,
            hearts_end_temp_c=95.0,
            heads_abv_threshold=78.0,
            tails_abv_threshold=45.0,
        )
        r = estimate_cuts(50.0, 10.0, cut_points=cp)
        assert r["cut_temperatures"]["heads_end_c"] == 80.0

    def test_wash_abv_fuera_de_rango(self):
        with pytest.raises(ValueError):
            estimate_cuts(100.0, 25.0)  # 25% demasiado alto para un wash


class TestGetMashProfile:
    def test_maiz_profile(self):
        r = get_mash_profile("maiz", 10.0, 35.0)
        assert r["gelatinization_temp_c"] == 75.0
        assert r["water_grain_ratio"] == pytest.approx(3.5, abs=0.1)
        assert len(r["enzyme_additions"]) > 0
        # Verificar que las cantidades estan calculadas
        for enzyme in r["enzyme_additions"]:
            assert "total_dose_grams" in enzyme

    def test_cebada_malteada_sin_enzimas(self):
        r = get_mash_profile("cebada_malteada", 5.0, 15.0)
        assert r["enzyme_additions"] == []

    def test_cereal_desconocido(self):
        with pytest.raises(ValueError, match="no reconocido"):
            get_mash_profile("patata", 10.0, 30.0)

    @pytest.mark.parametrize("cereal", MASH_PROFILES.keys())
    def test_todos_los_cereales(self, cereal):
        r = get_mash_profile(cereal, 10.0, 35.0)
        assert "gelatinization_temp_c" in r
        assert "saccharification_temp_c" in r
        assert "notes" in r


class TestFermentableDatabase:
    def test_todos_los_fermentables_tienen_spec_completa(self):
        for key, spec in FERMENTABLE_DATABASE.items():
            assert spec.sugar_content_pct > 0, f"{key}: sugar_content_pct debe ser > 0"
            assert spec.fermentation_yield_pct > 0, f"{key}: yield debe ser > 0"
            assert spec.typical_og_per_kg_per_liter > 0, f"{key}: og_per_kg debe ser > 0"
