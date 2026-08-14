from rest_framework.views import exception_handler


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is not None:
        error_payload = {
            "success": False,
            "errors": response.data,
        }
        response.data = error_payload
    return response
