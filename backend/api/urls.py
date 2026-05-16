from django.urls import path

from . import views, views_auth, views_extras

urlpatterns = [
    path("health", views.health),
    path("auth/login", views_auth.auth_login),
    path("auth/me", views_auth.auth_me),
    path("live", views_extras.live_snapshot),
    path("stats/export.csv", views_extras.stats_export_csv),
    # zones
    path("zones", views.zones),
    path("zones/<int:pk>", views.zone_detail),
    # workstations (specific paths before generic id)
    path("workstations/zone/<int:zone_id>", views.workstations_by_zone),
    path("workstations/<int:pk>/command", views_extras.workstation_command),
    path("workstations", views.workstations),
    path("workstations/<int:pk>", views.workstation_detail),
    # agent (X-Agent-Token)
    path("agent/pending", views_extras.agent_pending),
    path("agent/ack", views_extras.agent_ack),
    path("agent/heartbeat", views_extras.agent_heartbeat),
    # clients
    path("clients/search", views.clients_search),
    path("clients", views.clients),
    path("clients/<int:pk>", views.client_detail),
    # tariffs
    path("tariffs", views.tariffs),
    path("tariffs/<int:pk>", views.tariff_detail),
    # sessions
    path("sessions/active", views.sessions_active),
    path("sessions", views.sessions),
    path("sessions/<int:pk>/end", views.session_end),
    path("sessions/<int:pk>/extend", views.session_extend),
    path("sessions/<int:pk>/pause", views.session_pause),
    path("sessions/<int:pk>/resume", views.session_resume),
    # products
    path("products", views.products),
    path("products/<int:pk>", views.product_detail),
    # sales
    path("sales/<int:pk>/items", views.sale_items),
    path("sales", views.sales),
    # promos
    path("promos/apply", views.promos_apply),
    path("promos", views.promos),
    path("promos/<int:pk>", views.promo_detail),
    # tasks
    path("tasks", views.tasks),
    path("tasks/<int:pk>/complete", views.task_complete),
    path("tasks/<int:pk>/reopen", views.task_reopen),
    path("tasks/<int:pk>", views.task_delete),
    # settings
    path("settings", views.settings_view),
    # stats
    path("stats/dashboard", views.stats_dashboard),
    path("stats/analytics", views.stats_analytics),
    # player orders
    path("orders", views.orders),
    path("orders/<int:pk>/complete", views.order_complete),
    path("orders/<int:pk>/cancel", views.order_cancel),
]
