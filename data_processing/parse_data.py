import ast
import math

import pandas as pd
import json
from math import isnan
import multiprocessing

movies_metadata = pd.read_csv("kaggle/movies_metadata.csv", low_memory=False)
keywords_csv = pd.read_csv("kaggle/keywords.csv", low_memory=False)

print("Number of rows", len(movies_metadata))
print("Number of rows of keywords", len(keywords_csv))


def get_keywords_by_id(id):
    for row in range(len(keywords_csv)):
        if int(keywords_csv.at[row, 'id']) == int(id):
            return keywords_csv.at[row, 'keywords']
    return None


manager = multiprocessing.Manager()
moviesDict = manager.dict()


def process_chuck(thread_id, start_row, end_row, dict):
    for current_row in range(start_row, end_row):
        try:
            id = movies_metadata.at[current_row, 'id']
            imdb_id = movies_metadata.at[current_row, 'imdb_id']
            title = movies_metadata.at[current_row, 'title']
            genres = ast.literal_eval(movies_metadata.at[current_row, 'genres'])
            release_data = movies_metadata.at[current_row, 'release_date']  # Format 1989-02-17
            runtime = float(movies_metadata.at[current_row, 'runtime'])
            spoken_languages = ast.literal_eval(movies_metadata.at[current_row, 'spoken_languages'])
            keywords = ast.literal_eval(get_keywords_by_id(id))
            vote_average = float(movies_metadata.at[current_row, 'vote_average'])
            vote_count = int(movies_metadata.at[current_row, 'vote_count'])
            revenue = int(movies_metadata.at[current_row, 'revenue'])
            popularity = float(movies_metadata.at[current_row, 'popularity'])
            budget = int(movies_metadata.at[current_row, 'budget'])
        except ValueError:
            print("Wrong format")
        else:
            if vote_average > 0 and vote_count > 0 and revenue > 0 and popularity > 0 and budget > 0 and \
                    keywords is not None and not isnan(runtime):
                dict[id] = {
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
                if current_row % 10 == 0:
                    process_count = (current_row - start_row) / (end_row - start_row)
                    print("TR", thread_id, "\tProgress:", int(process_count * 100), "%")

    print("TR", thread_id, "\tEND")


cpu_cores = multiprocessing.cpu_count()
chuck_size = len(movies_metadata) // cpu_cores
processes = []
for i in range(cpu_cores):
    p = multiprocessing.Process(target=process_chuck, args=(i, chuck_size * i, chuck_size * (i + 1), moviesDict))
    processes.append(p)

if len(movies_metadata) > chuck_size * cpu_cores:
    p = multiprocessing.Process(target=process_chuck,
                                args=(cpu_cores, chuck_size * cpu_cores, len(movies_metadata), moviesDict))
    processes.append(p)

for p in processes:
    p.start()

for p in processes:
    p.join()

print("Movies size", len(moviesDict))
with open('dataset.json', 'w') as outfile:
    json.dump(moviesDict.copy(), outfile, allow_nan=False, indent=1)
