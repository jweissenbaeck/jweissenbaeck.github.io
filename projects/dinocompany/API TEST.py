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
    
    # Check if the response contains 'numbers' and 'date'
    if 'numbers' in data and 'date' in data:
        numbers = data['numbers']
        draw_date = data['date']
        
        # Create a dictionary to store the numbers and date data
        lottery_data = {
            "numbers": numbers,
            "date": draw_date
        }

        # Write the lottery data to a JSON file
        with open('lottery_numbers.json', 'w') as json_file:
            json.dump(lottery_data, json_file, indent=4)

        print("Die Daten wurden erfolgreich in die Datei 'lottery_data.json' geschrieben.")
    else:
        print("Die Antwort enthält nicht die erwarteten Schlüssel 'numbers' oder 'date'.")
else:
    print(f"Fehler beim Abrufen der Daten. HTTP-Statuscode: {response.status_code}")
