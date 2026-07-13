"""Startup guards: production hosts must never run on the git-public dev
replay secret (fail closed if render.yaml env wiring breaks)."""

from __future__ import annotations

import pytest

from app.config import Settings
from app.main import _refuse_dev_secret_in_production


def test_dev_secret_refused_on_render(monkeypatch):
    monkeypatch.setenv("RENDER", "true")
    with pytest.raises(RuntimeError, match="dev default"):
        _refuse_dev_secret_in_production(Settings())


def test_dev_secret_refused_in_production_env(monkeypatch):
    monkeypatch.delenv("RENDER", raising=False)
    with pytest.raises(RuntimeError, match="dev default"):
        _refuse_dev_secret_in_production(Settings(environment="production"))


def test_dev_secret_allowed_in_development(monkeypatch):
    monkeypatch.delenv("RENDER", raising=False)
    _refuse_dev_secret_in_production(Settings())


def test_real_secret_allowed_on_render(monkeypatch):
    monkeypatch.setenv("RENDER", "true")
    _refuse_dev_secret_in_production(Settings(replay_session_secret="rotated-" + "x" * 40))
