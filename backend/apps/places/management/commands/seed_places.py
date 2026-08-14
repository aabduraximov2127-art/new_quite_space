import json
from pathlib import Path

from django.core.management.base import BaseCommand

from apps.availability.models import Availability
from apps.places.models import Place


class Command(BaseCommand):
    help = "Toshkentdagi haqiqiy joylarni database'ga yuklash"

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Mavjud joylarni o'chirib, qayta yuklash",
        )

    def handle(self, *args, **options):
        json_path = Path(__file__).resolve().parents[5] / "data" / "tashkent_places.json"
        if not json_path.exists():
            json_path = Path(__file__).resolve().parents[4] / "data" / "tashkent_places.json"

        with open(json_path, encoding="utf-8") as f:
            places_data = json.load(f)

        if options["reset"]:
            Place.objects.all().delete()
            self.stdout.write("Eski joylar o'chirildi")

        created = 0
        updated = 0
        for data in places_data:
            place, was_created = Place.objects.update_or_create(
                name=data["name"],
                defaults=data,
            )
            if was_created:
                created += 1
            else:
                updated += 1
            Availability.objects.update_or_create(
                place=place,
                defaults={
                    "total_seats": place.capacity,
                    "available_seats": place.available_seats,
                    "occupied_seats": place.capacity - place.available_seats,
                },
            )

        self.stdout.write(
            self.style.SUCCESS(
                f"Tayyor: {created} ta yangi, {updated} ta yangilandi. Jami: {len(places_data)} ta haqiqiy joy"
            )
        )
