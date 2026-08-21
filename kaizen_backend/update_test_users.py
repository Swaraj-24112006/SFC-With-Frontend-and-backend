import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'kaizen_backend.settings')
django.setup()

from accounts.models import CustomUser

def update_test_users_phone():
    usernames = ['test_user_1', 'test_user_2', 'test_user_3']
    new_phone = '9359276240'
    
    users = CustomUser.objects.filter(username__in=usernames)
    
    if not users.exists():
        print("No test users found!")
        return
        
    for user in users:
        user.phone = new_phone
        user.save()
        print(f"Updated user: {user.username} with new phone number: {user.phone}")

if __name__ == '__main__':
    update_test_users_phone()
