import os
import django

# Setup django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'kaizen_backend.settings')
django.setup()

from accounts.models import CustomUser, Role

def create_users():
    print("Creating test users...")
    
    # Get or create a basic role
    role, _ = Role.objects.get_or_create(
        name='test_role',
        defaults={'description': 'Role for test users'}
    )
    
    users_data = [
        {
            'username': 'test_user_1',
            'employee_id': 'EMP-TEST-01',
            'email': 'test1@kaizen.local',
            'phone': '9518779367',
            'password': 'SecurePassword123!',
            'first_name': 'Test',
            'last_name': 'One'
        },
        {
            'username': 'test_user_2',
            'employee_id': 'EMP-TEST-02',
            'email': 'test2@kaizen.local',
            'phone': '9518779367',
            'password': 'SecurePassword123!',
            'first_name': 'Test',
            'last_name': 'Two'
        },
        {
            'username': 'test_user_3',
            'employee_id': 'EMP-TEST-03',
            'email': 'test3@kaizen.local',
            'phone': '9518779367',
            'password': 'SecurePassword123!',
            'first_name': 'Test',
            'last_name': 'Three'
        }
    ]
    
    for data in users_data:
        # Check if user already exists
        if not CustomUser.objects.filter(username=data['username']).exists():
            user = CustomUser.objects.create_user(
                username=data['username'],
                email=data['email'],
                password=data['password'],
                employee_id=data['employee_id'],
                phone=data['phone'],
                first_name=data['first_name'],
                last_name=data['last_name'],
                role=role
            )
            print(f"Created user: {user.username} with phone {user.phone}")
        else:
            # Update phone number if user exists
            user = CustomUser.objects.get(username=data['username'])
            user.phone = data['phone']
            user.save()
            print(f"Updated user: {user.username} with phone {user.phone}")
            
    print("Done!")

if __name__ == '__main__':
    create_users()
