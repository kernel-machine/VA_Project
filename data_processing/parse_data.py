import ast
import ctypes
import json
import multiprocessing
from datetime import datetime
from math import isnan
from os.path import exists
from sklearn.manifold import MDS

import nltk
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

movies_metadata = pd.read_csv("kaggle/movies_metadata.csv", low_memory=False)
keywords_csv = pd.read_csv("kaggle/keywords.csv", low_memory=False)

print("Number of rows", len(movies_metadata))

manager = multiprocessing.Manager()
shared_list = manager.list()
progress_list = manager.list()


def get_keywords_by_id(id):
    for row in range(len(keywords_csv)):
        if int(keywords_csv.at[row, 'id']) == int(id):
            return keywords_csv.at[row, 'keywords']
    return None


def checkValidity(overview_a):
    return (isinstance(overview_a, str) or not isnan(overview_a)) and len(nltk.tokenize.word_tokenize(overview_a)) > 0


def checkValidity2(overview_a, overview_b):
    check_a = isinstance(overview_a, str) or not isnan(overview_a)
    check_b = isinstance(overview_b, str) or not isnan(overview_b)

    if not (check_a and check_b):
        return False

    X_list = nltk.tokenize.word_tokenize(overview_a)
    Y_list = nltk.tokenize.word_tokenize(overview_b)

    return len(X_list) > 0 and len(Y_list) > 0


def process_chuck(thread_id, start_row, end_row, result, progress):
    for current_row in range(start_row, end_row):
        try:
            movie_id = int(movies_metadata.at[current_row, 'id'])
            imdb_id = movies_metadata.at[current_row, 'imdb_id']
            title = movies_metadata.at[current_row, 'title']
            genres = ast.literal_eval(movies_metadata.at[current_row, 'genres'])
            release_data = movies_metadata.at[current_row, 'release_date']  # Format 1989-02-17
            release_year = datetime.strptime(str(release_data), "%Y-%m-%d").year
            runtime = float(movies_metadata.at[current_row, 'runtime'])
            spoken_languages = ast.literal_eval(movies_metadata.at[current_row, 'spoken_languages'])
            vote_average = float(movies_metadata.at[current_row, 'vote_average'])
            vote_count = int(movies_metadata.at[current_row, 'vote_count'])
            revenue = int(movies_metadata.at[current_row, 'revenue'])
            popularity = float(movies_metadata.at[current_row, 'popularity'])
            budget = int(movies_metadata.at[current_row, 'budget'])
            overview = movies_metadata.at[current_row, 'overview']
            keywords = ast.literal_eval(get_keywords_by_id(movie_id))
        except ValueError:
            pass  # print("Wrong format")
        else:
            if vote_average > 0 and vote_count > 0 and revenue > 0 and popularity > 0 and budget > 0 \
                    and not isnan(runtime) and len(spoken_languages) > 0 \
                    and len(genres) > 0 and checkValidity(overview) and keywords is not None and len(keywords) > 0:
                result.append({
                    'id': movie_id,
                    'imdb_id': imdb_id,
                    'title': title,
                    'genres': genres,
                    'release_data': release_data,
                    'release_year': release_year,
                    'runtime': runtime,
                    'spoken_languages': spoken_languages,
                    'vote_avg': vote_average,
                    'vote_count': vote_count,
                    'revenue': revenue,
                    'popularity': popularity,
                    'budget': budget,
                    'keywords': keywords,
                    'overview':overview
                })
                # Update progress status
                progress[thread_id] = int(100 * (current_row - start_row) // (end_row - start_row))
                if current_row % 100 == 10:
                    # Print progresses of the threads
                    print("PROGRESS", " ".join(list(map(lambda x: str(x) + "%", progress))))

    progress[thread_id] = 100


def computeSimilarity(overview_a, overview_b):
    if checkValidity2(overview_a, overview_b):
        x_list = nltk.tokenize.word_tokenize(overview_a)
        y_list = nltk.tokenize.word_tokenize(overview_b)

        # sw contains the list of stopwords
        sw = nltk.corpus.stopwords.words('english')
        l1 = []
        l2 = []

        # remove stop words from the string
        x_set = {w for w in x_list if not w in sw}
        y_set = {w for w in y_list if not w in sw}

        # form a set containing keywords of both strings
        rvector = x_set.union(y_set)
        for w in rvector:
            if w in x_set:
                l1.append(1)  # create a vector
            else:
                l1.append(0)
            if w in y_set:
                l2.append(1)
            else:
                l2.append(0)
        c = 0

        # cosine formula
        for i in range(len(rvector)):
            c += l1[i] * l2[i]
        cosine = c / float((sum(l1) * sum(l2)) ** 0.5)

        return cosine

    return 0


filename = "dataset.json"
if exists(filename):
    print("Skipping part 1")
else:
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

    print("STARTING STEP 1")
    for p in processes:
        p.start()

    for p in processes:
        p.join()

    movies = list(shared_list)

    print("Sorting")
    movies.sort(key=lambda x: x['id'])
    moviesDict = {'movies': movies}

    print("Movies size", len(moviesDict['movies']))
    with open(filename, 'w') as outfile:
        json.dump(moviesDict, outfile, allow_nan=False, indent=1)

movies = json.load(open(filename))['movies']
movies.sort(key=lambda x: x['id'])

print("ENDED STEP 1")

use_overview = True

filename = "similarity.npy"
if exists(filename):
    print("Skipping step 2")
else:
    print("STARTING STEP 2")
    movies_len = len(movies)
    sim_array = multiprocessing.Array('f', movies_len * movies_len)
    nltk.download('all')


    def process_chunk_similarity(start_row, end_row, shared_array, chuck_size):
        matrix = np.frombuffer(shared_array.get_obj(), ctypes.c_float)
        matrix = matrix.reshape((movies_len, movies_len))

        for row in range(start_row, end_row):
            if use_overview:
                first_movie_overviews = movies[row]['overview']
            else:
                first_movie_overviews = " ".join(list(map(lambda x: x['name'], movies[row]['keywords'])))

            for col in range(len(matrix[row])):
                # Since the similarity matrix is specular, you can take the specular value if it's already computed
                if matrix[col][row] == 0:
                    if use_overview:
                        second_movie_overviews = movies[col]['overview']
                    else:
                        second_movie_overviews = " ".join(list(map(lambda x: x['name'], movies[col]['keywords'])))
                    sim = computeSimilarity(first_movie_overviews, second_movie_overviews)
                    matrix[row][col] = sim
                else:
                    matrix[row][col] = matrix[col][row]

            if row % 10 == 0:
                print("PROCESS OF CHUCK", start_row // chuck_size, "AT", row - start_row, "OF", end_row - start_row)


    cpu_cores = multiprocessing.cpu_count()
    chuck_size = movies_len // cpu_cores
    processes = []

    for i in range(cpu_cores):
        p = multiprocessing.Process(target=process_chunk_similarity,
                                    args=(chuck_size * i, chuck_size * (i + 1), sim_array, chuck_size))
        processes.append(p)

    if movies_len > chuck_size * cpu_cores:
        p = multiprocessing.Process(target=process_chunk_similarity,
                                    args=(
                                        chuck_size * cpu_cores, movies_len, sim_array))
        processes.append(p)

    for p in processes:
        p.start()

    for p in processes:
        p.join()

    print("END")
    arr = np.frombuffer(sim_array.get_obj(), ctypes.c_float)
    arr = arr.reshape((movies_len, movies_len))

    np.save(filename, arr)

filename = "msd_reduction.csv"
if exists(filename):
    print("Skipping mds computation")
else:
    sim_matrix = np.load("similarity.npy")
    sim_matrix = 1 - sim_matrix
    embedding = MDS(verbose=2, dissimilarity='precomputed', n_jobs=-1, max_iter=3000, eps=1e-9)
    transformed = embedding.fit(sim_matrix)
    pos = embedding.embedding_

    for e in range(len(movies)):
        movies[e]['mds'] = list(pos[e])

    moviesDict = {'movies': movies}
    with open("dataset.json", 'w') as outfile:
        json.dump(moviesDict, outfile, allow_nan=False, indent=1)
