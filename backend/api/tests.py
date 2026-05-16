"""Smoke-тесты API (нужна рабочая БД из DATABASES)."""
from django.test import Client, TestCase


class ApiSmokeTests(TestCase):
    databases = {"default"}

    def test_health_without_auth(self):
        r = Client().get("/api/health")
        self.assertEqual(r.status_code, 200)

    def test_zones_requires_auth(self):
        r = Client().get("/api/zones")
        self.assertEqual(r.status_code, 401)
