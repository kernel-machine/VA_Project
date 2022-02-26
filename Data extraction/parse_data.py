import ast

import pandas as pd
import json

movies_metadata = pd.read_csv("kaggle/movies_metadata.csv", low_memory=False)
keywords_csv = pd.read_csv("kaggle/keywords.csv", low_memory=False)

print("Number of rows", len(movies_metadata))
print("Number of rows of keywords", len(keywords_csv))


def get_keywords_by_id(id):
    for row in range(len(keywords_csv)):
        if int(keywords_csv.at[row, 'id']) == int(id):
            return keywords_csv.at[row, 'keywords']
    return None

counter = 0
moviesDict = {}

for row in range(len(movies_metadata)):
    try:
        id = movies_metadata.at[row, 'id']
        imdb_id = movies_metadata.at[row, 'imdb_id']
        title = movies_metadata.at[row, 'title']
        genres = ast.literal_eval(movies_metadata.at[row, 'genres'])
        release_data = movies_metadata.at[row, 'release_date']  # Format 1989-02-17
        runtime = float(movies_metadata.at[row, 'runtime'])
        spoken_languages = ast.literal_eval(movies_metadata.at[row, 'spoken_languages'])
        keywords = ast.literal_eval(get_keywords_by_id(id))
        vote_average = float(movies_metadata.at[row, 'vote_average'])
        vote_count = int(movies_metadata.at[row, 'vote_count'])
        revenue = int(movies_metadata.at[row, 'revenue'])
        popularity = float(movies_metadata.at[row, 'popularity'])
        budget = int(movies_metadata.at[row, 'budget'])
    except ValueError:
        print("Wrong format")
    else:
        if vote_average > 0 and vote_count > 0 and revenue > 0 and popularity > 0 and budget > 0 and keywords is not None:
            counter += 1
            moviesDict[id] = {
                'imdb_id': imdb_id,
                'title': title,
                'genres': genres,
                'relase_data': release_data,
                'runtime': runtime,
                'spoken_languages': spoken_languages,
                'vote_avg': vote_average,
                'vote_count': vote_count,
                'revenue': revenue,
                'popularity': popularity,
                'budget': budget,
                'keywords': keywords
            }
            if counter % 100 == 0:
                print(counter)

with open('json_data_test.json', 'w') as outfile:
    json.dump(moviesDict, outfile)

print("Filtered elements", counter)
