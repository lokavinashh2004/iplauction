import urllib.request
import json
import urllib.parse
import os

players = [
    {
        'id': 1, 'firstName': 'JOS', 'lastName': 'BUTTLER', 'role': 'Wicketkeeper Batter',
        'country': 'ENG', 'age': 34, 'previousTeam': 'RR', 'basePrice': '2.00',
        'iplStat': '3582 Runs', 'set': 'M1'
    },
    {
        'id': 2, 'firstName': 'SHREYAS', 'lastName': 'IYER', 'role': 'Batsman',
        'country': 'IND', 'age': 30, 'previousTeam': 'KKR', 'basePrice': '2.00',
        'iplStat': '3127 Runs', 'set': 'M1'
    },
    {
        'id': 3, 'firstName': 'RISHABH', 'lastName': 'PANT', 'role': 'Wicketkeeper Batter',
        'country': 'IND', 'age': 27, 'previousTeam': 'DC', 'basePrice': '2.00',
        'iplStat': '3284 Runs', 'set': 'M1'
    },
    {
        'id': 4, 'firstName': 'KAGISO', 'lastName': 'RABADA', 'role': 'Bowler',
        'country': 'SA', 'age': 29, 'previousTeam': 'PBKS', 'basePrice': '2.00',
        'iplStat': '117 Wickets', 'set': 'M1'
    },
    {
        'id': 5, 'firstName': 'ARSHDEEP', 'lastName': 'SINGH', 'role': 'Bowler',
        'country': 'IND', 'age': 26, 'previousTeam': 'PBKS', 'basePrice': '2.00',
        'iplStat': '76 Wickets', 'set': 'M1'
    },
    {
        'id': 6, 'firstName': 'MITCHELL', 'lastName': 'STARC', 'role': 'Bowler',
        'country': 'AUS', 'age': 35, 'previousTeam': 'KKR', 'basePrice': '2.00',
        'iplStat': '51 Wickets', 'set': 'M1'
    },
    {
        'id': 7, 'firstName': 'YUZVENDRA', 'lastName': 'CHAHAL', 'role': 'Bowler',
        'country': 'IND', 'age': 34, 'previousTeam': 'RR', 'basePrice': '2.00',
        'iplStat': '200 Wickets', 'set': 'M2'
    },
    {
        'id': 8, 'firstName': 'LIAM', 'lastName': 'LIVINGSTONE', 'role': 'All-Rounder',
        'country': 'ENG', 'age': 31, 'previousTeam': 'PBKS', 'basePrice': '2.00',
        'iplStat': '939 Runs', 'set': 'M2'
    },
    {
        'id': 9, 'firstName': 'DAVID', 'lastName': 'MILLER', 'role': 'Batsman',
        'country': 'SA', 'age': 35, 'previousTeam': 'GT', 'basePrice': '1.50',
        'iplStat': '2714 Runs', 'set': 'M2'
    },
    {
        'id': 10, 'firstName': 'KL', 'lastName': 'RAHUL', 'role': 'Wicketkeeper Batter',
        'country': 'IND', 'age': 32, 'previousTeam': 'LSG', 'basePrice': '2.00',
        'iplStat': '4163 Runs', 'set': 'M2'
    }
]

for p in players:
    query_name = p['firstName'].capitalize() + ' ' + p['lastName'].capitalize()
    if query_name == 'Kl Rahul':
        query_name = 'KL Rahul'
    url = f'https://en.wikipedia.org/w/api.php?action=query&titles={urllib.parse.quote(query_name)}&prop=pageimages&format=json&pithumbsize=500'
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        res = urllib.request.urlopen(req)
        data = json.loads(res.read().decode('utf-8'))
        pages = data['query']['pages']
        img_url = 'https://ui-avatars.com/api/?name=' + urllib.parse.quote(query_name) + '&background=random&size=500'
        for page_id in pages:
            if 'thumbnail' in pages[page_id]:
                img_url = pages[page_id]['thumbnail']['source']
        p['imageUrl'] = img_url
    except Exception as e:
        p['imageUrl'] = 'https://ui-avatars.com/api/?name=' + urllib.parse.quote(query_name) + '&background=random&size=500'

with open("src/Players/playersData.js", "w") as f:
    f.write("export const PLAYERS_DATA = [\n")
    for i, p in enumerate(players):
        f.write("    {\n")
        for k, v in p.items():
            if isinstance(v, str):
                f.write(f'        "{k}": "{v}",\n')
            else:
                f.write(f'        "{k}": {v},\n')
        f.write("    }")
        if i < len(players) - 1:
            f.write(",\n")
        else:
            f.write("\n")
    f.write("];\n")
