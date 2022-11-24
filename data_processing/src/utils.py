from math import sqrt

def squared_sum(x):
    """ return 3 rounded square rooted value """
    return round(sqrt(sum([a*a for a in x])), 3)


def cos_similarity(x, y):
    """ return cosine similarity between two lists """
    numerator = sum(a*b for a, b in zip(x, y))
    denominator = squared_sum(x)*squared_sum(y)
    return round(numerator/float(denominator), 3)


def jaccard_similarity(x, y):
    """ returns the jaccard similarity between two lists """
    intersection_cardinality = len(set.intersection(*[set(x), set(y)]))
    union_cardinality = len(set.union(*[set(x), set(y)]))
    return intersection_cardinality/float(union_cardinality)