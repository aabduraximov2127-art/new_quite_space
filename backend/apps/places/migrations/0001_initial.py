import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="Place",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("name", models.CharField(max_length=255)),
                ("description", models.TextField()),
                (
                    "type",
                    models.CharField(
                        choices=[
                            ("cafe", "Cafe"),
                            ("library", "Library"),
                            ("coworking", "Coworking"),
                            ("free_zone", "Free Zone"),
                        ],
                        max_length=20,
                    ),
                ),
                ("address", models.CharField(max_length=500)),
                ("district", models.CharField(db_index=True, max_length=100)),
                ("latitude", models.DecimalField(decimal_places=6, max_digits=9)),
                ("longitude", models.DecimalField(decimal_places=6, max_digits=9)),
                ("price", models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ("working_hours", models.JSONField(blank=True, default=dict)),
                ("wifi_speed", models.PositiveIntegerField(help_text="Mbps")),
                (
                    "noise_level",
                    models.CharField(
                        choices=[
                            ("quiet", "Tinch"),
                            ("moderate", "O'rtacha"),
                            ("noisy", "Shovqinli"),
                        ],
                        max_length=20,
                    ),
                ),
                ("sockets", models.BooleanField(default=True)),
                ("capacity", models.PositiveIntegerField()),
                ("available_seats", models.PositiveIntegerField(default=0)),
                ("rating", models.DecimalField(decimal_places=2, default=0, max_digits=3)),
                ("amenities", models.JSONField(blank=True, default=list)),
                ("is_approved", models.BooleanField(default=False)),
                (
                    "created_by",
                    models.ForeignKey(
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="places",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-rating", "-created_at"],
            },
        ),
        migrations.CreateModel(
            name="PlaceImage",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("image", models.ImageField(upload_to="places/")),
                ("is_primary", models.BooleanField(default=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "place",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="images",
                        to="places.place",
                    ),
                ),
            ],
            options={
                "ordering": ["-is_primary", "-created_at"],
            },
        ),
    ]
