from projectedge_inference.readiness import ReadinessState


def test_readiness_transitions() -> None:
    state = ReadinessState()
    assert state.is_ready is False

    state.mark_ready(model_version="v1.0.0")
    assert state.is_ready is True
    assert state.model_version == "v1.0.0"

    state.mark_not_ready(reason="bundle_validation_failed")
    assert state.is_ready is False
    assert state.reason == "bundle_validation_failed"

