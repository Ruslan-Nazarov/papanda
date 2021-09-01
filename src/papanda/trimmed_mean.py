# July 2021
import numpy as np
import pandas as pd
import scipy.stats
import math
import pkgutil

"""
Compute trimmed mean.

See details https://en.wikipedia.org/wiki/Truncated_mean

Compliant ISO 16269-4:2010

Parameters
____________

data: array_like.

Returns
____________

data_mean: DataFrame.
        Contains percentage outliers and trimmed mean.

Example
____________

See example in func_examples.ipynb github

Notes
____________

For symmetric distributions only.
"""

def trim_mean(data):
    alpha = [0.05, 0.10, 0.15, 0.18, 0.20]
    len_data = len(data)
    mean_column = []
    for i in alpha:
        a = 1 / (len_data * (1-(2*i)))
        r = math.floor(i * len_data)
        g = i * len_data - r
        x_r = data[r]
        x_n = data[len_data-r-1]
        x_i = data[(r+2-1):(len_data-r-1)]
        b = (1 - g) * (x_r + x_n) + np.sum(x_i)
        xmean = (1 / (len_data * (1-(2*i)))) * ((1 - g) * (x_r + x_n) + np.sum(x_i))
        mean_column.append(xmean)
    data_mean = pd.DataFrame({"per_outliers": [0.05, 0.10, 0.15, 0.18, 0.20], "trim_mean": mean_column})
    print(data_mean)
    print()
    print('Mean for whole data: {m}'.format(m=np.mean(data)))
    print()
    print('Median for whole data: {md}'.format(md=np.median(data)))