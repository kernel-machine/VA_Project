import ast

import pandas as pd
import json
from math import isnan
import multiprocessing
import os

movies_metadata = pd.read_csv("kaggle/movies_metadata.csv", low_memory=False)
keywords_csv = pd.read_csv("kaggle/keywords.csv", low_memory=False)

print("Number of rows", len(movies_metadata))
print("Number of rows of keywords", len(keywords_csv))

manager = multiprocessing.Manager()
shared_list = manager.list()
progress_list = manager.list()


def get_keywords_by_id(id):
    for row in range(len(keywords_csv)):
        if int(keywords_csv.at[row, 'id']) == int(id):
            return keywords_csv.at[row, 'keywords']
    return None


def process_chuck(thread_id, start_row, end_row, result, progress):
    for current_row in range(start_row, end_row):
        try:
            movie_id = int(movies_metadata.at[current_row, 'id'])
            imdb_id = movies_metadata.at[current_row, 'imdb_id']
            title = movies_metadata.at[current_row, 'title']
            genres = ast.literal_eval(movies_metadata.at[current_row, 'genres'])
            release_data = movies_metadata.at[current_row, 'release_date']  # Format 1989-02-17
            runtime = float(movies_metadata.at[current_row, 'runtime'])
            spoken_languages = ast.literal_eval(movies_metadata.at[current_row, 'spoken_languages'])
            keywords = ast.literal_eval(get_keywords_by_id(movie_id))
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
                result.append({
                    'id': movie_id,
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
                })
                # Update progress status
                progress[thread_id] = int(100 * (current_row - start_row) // (end_row - start_row))
                if current_row % 100 == 0:
                    # Print progresses of the threads
                    print("PROGRESS", " ".join(list(map(lambda x: str(x) + "%", progress))))

    progress[thread_id] = 100


cpu_cores = multiprocessing.cpu_count()
chuck_size = len(movies_metadata) // cpu_cores
processes = []
for i in range(cpu_cores):
    progress_list.append(0)
    p = multiprocessing.Process(target=process_chuck,
                                args=(i, chuck_size * i, chuck_size * (i + 1), shared_list, progress_list))
    processes.append(p)

if len(movies_metadata) > chuck_size * cpu_cores:
    progress_list.append(0)
    p = multiprocessing.Process(target=process_chuck,
                                args=(
                                    cpu_cores, chuck_size * cpu_cores, len(movies_metadata), shared_list,
                                    progress_list))
    processes.append(p)

for p in processes:
    p.start()

for p in processes:
    p.join()

movies = list(shared_list)

print("Sorting")
movies.sort(key=lambda x: x['id'])
moviesDict = {'movies': movies}

print("Movies size", len(moviesDict['movies']))
with open('dataset.json', 'w') as outfile:
    json.dump(moviesDict, outfile, allow_nan=False, indent=1)
