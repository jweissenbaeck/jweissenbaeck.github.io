import requests
import json

api_url = 'https://api.lotteryresultsapi.com/lottery/euromillions/draw/latest/numbers'

# Define the API endpoint and the headers
headers = {
    'X-Api-Token': '6260ee2fdd6c8d842a4efb5651d9e679bd2a03120d8af1fe96ed043d76160c78'
}

# Make the GET request
response = requests.get(api_url, headers=headers)

# Check if the request was successful
if response.status_code == 200:
    # Parse the JSON response
    data = response.json()
    
    # Assuming the response contains 'numbers' key with a list of numbers
    if 'numbers' in data:
        numbers = data['numbers']
        # Create a dictionary to store the numbers data
        numbers_data = {
            "numbers": numbers
        }

        # Write the numbers data to a JSON file
        with open('lottery_numbers.json', 'w') as json_file:
            json.dump(numbers_data, json_file, indent=4)

        print("Die Daten wurden erfolgreich in die Datei 'lottery_numbers.json' geschrieben.")
    else:
        print("No 'numbers' key in the response data.")
else:
    print(f"Failed to retrieve data. HTTP Status code: {response.status_code}")

