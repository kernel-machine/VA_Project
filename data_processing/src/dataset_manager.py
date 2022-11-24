import kaggle
import zipfile
import os
import glob


class DatasetManager:
    def downloadDataset(self):
        kaggle.api.authenticate()
        print("Downloading dataset")
        kaggle.api.dataset_download_files(
            "rounakbanik/the-movies-dataset", path="./kaggle"
        )
        print("Unzipping")
        with zipfile.ZipFile("./kaggle/the-movies-dataset.zip", "r") as zipref:
            zipref.extractall("./kaggle/")

    def isDownloadNeeded(self):
        if os.path.exists("./kaggle"):
            present_file = os.listdir("./kaggle")
            neededFiles = ["credits.csv", "keywords.csv", "movies_metadata.csv"]
            if all(elem in present_file for elem in neededFiles):
                print("Files already exists")
                return False
            else:
                print("Download needed")
                for e in glob.glob("./kaggle/*"):
                    os.remove(e)
                return True
        else:
            os.mkdir("kaggle")
            return True
