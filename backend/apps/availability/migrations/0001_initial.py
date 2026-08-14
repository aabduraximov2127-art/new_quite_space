import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("places", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="Availability",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("total_seats", models.PositiveIntegerField()),
                ("available_seats", models.PositiveIntegerField()),
                ("occupied_seats", models.PositiveIntegerField(default=0)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("available", "Bo'sh"),
                            ("busy", "Kam joy"),
                            ("full", "To'liq"),
                        ],
                        default="available",
                        max_length=20,
                    ),
                ),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "place",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="availability",
                        to="places.place",
                    ),
                ),
            ],
            options={
                "verbose_name_plural": "availabilities",
            },
        ),
    ]
