import pandas as pd


class Inflation:

    def __init__(self):
        self.csv_file = pd.read_csv("inflation_data.csv", low_memory=False)
        self.years = list(self.csv_file.year)
        self.indexes = list(self.csv_file.amount)

    def compute(self, start_year, end_year, amount):
        start_index = self.years.index(start_year)
        end_index = self.years.index(end_year)
        ratio = self.indexes[end_index] / self.indexes[start_index]
        return amount * ratio
