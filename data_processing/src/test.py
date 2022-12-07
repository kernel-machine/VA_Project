import unittest
import json
import numpy as np
from utils import jaccard_similarity
from random import sample
from inflation import Inflation


class MyUnitTest(unittest.TestCase):
    def test_similarity(self):
        ds_file = open("dataset.json")
        ds_json = json.load(ds_file)
        keywords = list(map(lambda x: x["keywords"], ds_json["movies"]))
        ds_file.close()
        sim_matrix = np.load("similarity.npy")
        equalElements = 0
        random_numbers_row = sample(list(range(len(keywords))), 100)
        random_numbers_col = sample(list(range(len(keywords))), 100)
        for row in random_numbers_row:
            for col in random_numbers_col:
                a_keywords = list(map(lambda x: x["id"], keywords[row]))
                b_keywords = list(map(lambda x: x["id"], keywords[col]))
                sim = jaccard_similarity(a_keywords, b_keywords)
                # if sim>0:
                #    print(sim,sim_matrix[row][col],keywords[row],keywords[col])
                if np.isclose(sim, sim_matrix[row][col]):
                    equalElements += 1
                else:
                    print(row, col, sim, sim_matrix[row][col])
                    AssertionError("Error")
        self.assertEqual(
            equalElements, len(random_numbers_row) * len(random_numbers_col)
        )

    def testInflation(self):
        inflation = Inflation()
        self.assertAlmostEqual(int(inflation.compute(1912, 2022, 5)), int(153.61), places=1)
        self.assertAlmostEqual(int(inflation.compute(1923, 2017, 5)), int(71.6), places=1)


if __name__ == "__main__":
    unittest.main()
