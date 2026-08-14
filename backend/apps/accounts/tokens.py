from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import User


class EmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["name"] = user.name
        token["role"] = user.role
        return token

    def validate(self, attrs):
        # SimpleJWT default field name is username; accept email too
        if "email" in self.initial_data and "username" not in attrs:
            attrs["username"] = self.initial_data["email"]
        return super().validate(attrs)
