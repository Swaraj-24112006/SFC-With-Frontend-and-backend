import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'kaizen_backend.settings')
django.setup()

from accounts.models import CustomUser, Role

def create_user():
    role, _ = Role.objects.get_or_create(name='initiator', defaults={'display_name': 'Initiator'})
    
    phone_number = '9518779367'
    usernames = ['test_user_1', 'test_user_2', 'test_user_3']
    
    for username in usernames:
        user, created = CustomUser.objects.get_or_create(
            username=username,
            defaults={
                'phone': phone_number,
                'email': f'{username}@example.com',
                'first_name': 'Test',
                'last_name': username.split('_')[-1].capitalize(),
                'role': role
            }
        )
        if not created:
            user.phone = phone_number
            user.save()
            
        user.set_password('DevPassword123!')
        user.is_active = True
        user.save()
        
        if created:
            print(f'User "{username}" created successfully with phone {phone_number}.')
        else:
            print(f'User "{username}" updated successfully with phone {phone_number}.')
            
    print('Password for all users is set to: DevPassword123!')

if __name__ == '__main__':
    create_user()
