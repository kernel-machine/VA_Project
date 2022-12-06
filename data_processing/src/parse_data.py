import ast
import ctypes
import json
import multiprocessing
import os
from datetime import datetime
from math import isnan
from sklearn.manifold import MDS

import numpy as np
import pandas as pd
import cpi

from utils import jaccard_similarity
from dataset_manager import DatasetManager

### Download  ###
if __name__ == "__main__":
    cpi.update()
    dm = DatasetManager()
    if dm.isDownloadNeeded():
        dm.downloadDataset()

### END DOWNLOAD ###

movies_metadata = pd.read_csv("kaggle/movies_metadata.csv", low_memory=False)
keywords_csv = pd.read_csv("kaggle/keywords.csv", low_memory=False, index_col="id")
credit_csv = pd.read_csv("kaggle/credits.csv", low_memory=False, index_col="id")


def validate_date(date_text):
    try:
        datetime.strptime(date_text, "%Y-%m-%d")
        return True
    except ValueError:
        return False


a = list(movies_metadata.release_date)
a = list(filter(lambda x: isinstance(x, str) and validate_date(x), a))
a = list(map(lambda x: datetime.strptime(x, "%Y-%m-%d").year, a))
max_release_year = max(a)
print("MAX YEAR:", max_release_year)


def get_director_by_id(id):
    json_crew = credit_csv.loc[id].crew
    crew = ast.literal_eval(json_crew)
    for e in crew:
        if e["job"] == "Director":
            return e["name"]
    return ""


def get_keywords_by_id(id):
    return keywords_csv.loc[id].keywords


def checkValidity(overview_a):
    return isinstance(overview_a, str) or not isnan(overview_a)


def process_chuck(thread_id, start_row, end_row, result, progress):
    for current_row in range(start_row, end_row):
        try:
            movie_id = int(movies_metadata.at[current_row, "id"])
            imdb_id = movies_metadata.at[current_row, "imdb_id"]
            title = movies_metadata.at[current_row, "title"]
            genres = ast.literal_eval(movies_metadata.at[current_row, "genres"])
            # Format 1989-02-17
            release_data = movies_metadata.at[current_row, "release_date"]
            release_year = datetime.strptime(str(release_data), "%Y-%m-%d").year
            runtime = float(movies_metadata.at[current_row, "runtime"])
            spoken_languages = ast.literal_eval(
                movies_metadata.at[current_row, "spoken_languages"]
            )
            vote_average = float(movies_metadata.at[current_row, "vote_average"])
            vote_count = int(movies_metadata.at[current_row, "vote_count"])
            revenue = int(movies_metadata.at[current_row, "revenue"])
            revenue_inflated = int(cpi.inflate(revenue, release_year, max_release_year))
            popularity = float(movies_metadata.at[current_row, "popularity"])
            budget = int(movies_metadata.at[current_row, "budget"])
            budget_inflated = int(cpi.inflate(budget, release_year, max_release_year))
            overview = movies_metadata.at[current_row, "overview"]
            keywords = ast.literal_eval(get_keywords_by_id(movie_id))
            director = get_director_by_id(movie_id)
        except ValueError or KeyError:
            pass  # print("Wrong format")
        else:
            if (
                    vote_average > 0
                    and vote_count > 0
                    and revenue > 0
                    and popularity > 0
                    and budget > 0
                    and not isnan(runtime)
                    and len(spoken_languages) > 0
                    and len(genres) > 0
                    and checkValidity(overview)
                    and keywords is not None
                    and len(keywords) > 0
            ):
                result.append(
                    {
                        "id": movie_id,
                        "title": title,
                        "genres": genres,
                        "release_year": release_year,
                        "runtime": runtime,
                        "spoken_languages": spoken_languages,
                        "vote_avg": vote_average,
                        "vote_count": vote_count,
                        "revenue": revenue,
                        "revenue_inflated": revenue_inflated,
                        "popularity": popularity,
                        "budget": budget,
                        "budget_inflated": budget_inflated,
                        "keywords": keywords,
                        "director": director,
                    }
                )
                # Update progress status
                progress[thread_id] = int(
                    100 * (current_row - start_row) // (end_row - start_row)
                )
                if current_row % 100 == 10:
                    # Print progresses of the threads
                    print(
                        "PROGRESS",
                        " ".join(list(map(lambda x: str(x) + "%", progress))),
                    )

    progress[thread_id] = 100


def process_chunk_similarity(start_row, end_row, shared_array, process_id, keywords):
    keyworkds_len = len(keywords)
    sim_matrix = np.frombuffer(shared_array.get_obj(), ctypes.c_float)
    sim_matrix = sim_matrix.reshape((keyworkds_len, keyworkds_len))

    """
    Each process process a set of rows
    """
    for row in range(start_row, end_row):
        for col in range(len(keywords)):
            # Since the similarity matrix is specular, you can take the specular value if it's already computed
            if sim_matrix[col][row] == 0:
                a_keywords = list(map(lambda x: x["id"], keywords[row]))
                b_keywords = list(map(lambda x: x["id"], keywords[col]))
                sim_matrix[row][col] = jaccard_similarity(a_keywords, b_keywords)
            else:
                sim_matrix[row][col] = sim_matrix[col][row]

        if row % 10 == 0:
            print(
                "PROCESS N°:",
                process_id,
                "AT: {:.2f}%".format(100 * ((row - start_row) / (end_row - start_row))),
            )


if __name__ == "__main__":
    manager = multiprocessing.Manager()
    shared_list = manager.list()
    progress_list = manager.list()

    ### BEGIN PREPROCESSING ###
    filename = "dataset.json"
    if os.path.exists(filename):
        print("Skipping part 1")
    else:
        cpu_cores = multiprocessing.cpu_count()
        chuck_size = len(movies_metadata) // cpu_cores
        processes = []
        for i in range(cpu_cores):
            progress_list.append(0)
            p = multiprocessing.Process(
                target=process_chuck,
                args=(
                    i,
                    chuck_size * i,
                    chuck_size * (i + 1),
                    shared_list,
                    progress_list,
                ),
            )
            processes.append(p)

        if len(movies_metadata) > chuck_size * cpu_cores:
            progress_list.append(0)
            p = multiprocessing.Process(
                target=process_chuck,
                args=(
                    cpu_cores,
                    chuck_size * cpu_cores,
                    len(movies_metadata),
                    shared_list,
                    progress_list,
                ),
            )
            processes.append(p)

        print("STARTING STEP 1")
        for p in processes:
            p.start()

        for p in processes:
            p.join()

        movies = list(shared_list)

        print("Sorting")
        movies.sort(key=lambda x: x["id"])
        moviesDict = {"movies": movies}

        print("Movies size", len(moviesDict["movies"]))
        with open(filename, "w") as outfile:
            json.dump(moviesDict, outfile, allow_nan=False, indent=1)
            print("Written in " + filename)

    ### END PREPROCESSING ###
    ### BEGIN SIMILARITY ###

    filename = "similarity.npy"
    if os.path.exists(filename):
        print("Similarity already computed")
    else:
        print("Computing similairty")
        ds_file = open("dataset.json")
        ds_json = json.load(ds_file)

        keywords = list(map(lambda x: x["keywords"], ds_json["movies"]))
        ds_file.close()

        keywords_len = len(keywords)
        sim_array = multiprocessing.Array("f", keywords_len * keywords_len)
        cpu_cores = multiprocessing.cpu_count()
        chuck_size = keywords_len // cpu_cores
        processes = []

        for i in range(cpu_cores):
            startIndex = chuck_size * i
            endIndex = chuck_size * (i + 1)
            p = multiprocessing.Process(
                target=process_chunk_similarity,
                args=(startIndex, endIndex, sim_array, i, keywords),
            )
            processes.append(p)

        if keywords_len > chuck_size * cpu_cores:
            startIndex = chuck_size * cpu_cores
            endIndex = keywords_len
            p = multiprocessing.Process(
                target=process_chunk_similarity,
                args=(startIndex, endIndex, sim_array, cpu_cores, keywords),
            )
            processes.append(p)

        for p in processes:
            p.start()

        for p in processes:
            p.join()

        arr = np.frombuffer(sim_array.get_obj(), ctypes.c_float)
        arr = arr.reshape((keywords_len, keywords_len))
        np.save(filename, arr)
        print("Similairty matrix written")

    filename = "msd_reduction.csv"
    if os.path.exists(filename):
        print("Skipping mds computation")
    else:
        sim_matrix = np.load("similarity.npy").clip(0, 1)
        sim_matrix = 1 - sim_matrix
        embedding = MDS(
            max_iter=1000,
            dissimilarity="precomputed",
            n_jobs=-1,
            n_init=8,
            verbose=2,
            eps=1e-6,
        )
        transformed = embedding.fit(sim_matrix)
        pos = embedding.embedding_

        ds_file = open("dataset.json")
        ds_json = json.load(ds_file)["movies"]
        for e in range(len(ds_json)):
            ds_json[e]["mds"] = list(pos[e])
        ds_file.close()

        moviesDict = {"movies": ds_json}
        with open("dataset.json", "w") as outfile:
            json.dump(moviesDict, outfile, allow_nan=False, indent=1)
