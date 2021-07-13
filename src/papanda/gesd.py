# July 2021
import numpy as np
import pandas as pd
import scipy.stats
import math

"""
Conducts GESD test for detecting outliers

See details https://www.itl.nist.gov/div898/handbook/eda/section3/eda35h3.htm

Complaint ISO 16269-4:2010

Parameters
____________

data: array_like.

alpha: significance level, optional
    Default is 0.05.

max_outliers: int

Returns
____________

data_without_out: DataFrame

Example
____________

See example in func_examples.ipynb github

Notes
____________

r: control statistics
l: critical value

1) The data should be approximately normally distributed. 
2) It is necessary to establish the expected number of outliers
on the normal distribution schedule. 
3) max_outliers must be greater than 1
"""

def GESD(data, alpha, max_outliers):
    """
    Compute control statistics.
    """

    def test_stat(data):
        mean = np.mean(data)
        std = np.std(data)
        list_difference = []
        for i in data:
            difference = round(abs(i - mean), 4)
            list_difference.append(difference)
        max_difference = max(list_difference)
        max_ind = np.argmax(list_difference)
        r = round((max_difference / np.std(data, dtype=np.float32, ddof=1)), 4)
        return r, max_ind

    """
    Compute critical value
    """
    def critical_value(data, alpha):
        p = (1 - alpha/2)**(1 / (len(data) - 0))
        t = scipy.stats.t.ppf(p, len(data))
        l =  ((len(data) - 1) * t) / np.sqrt((len(data) - 2 + np.square(t))*(len(data) - 1))
        return l

    r = []
    l = []
    index = []
    outliers = []
    for iterations in range(0, max_outliers):
        stat, max_ind = test_stat(data)
        critical = critical_value(data, alpha)
        if stat >= critical:
            out = [e for i, e in enumerate(data) if i == max_ind]
            data = np.delete(data, max_ind)
        elif stat <= critical:
            out = 'Not outlier'
        l.append(critical)
        r.append(stat)
        outliers.append(out)
    data_without_out = pd.DataFrame({'number_of_outliers': range(0, max_outliers), 'r-stat': r, 'l-critical': l, 'index_of_outliers': list(np.hstack(outliers))})
    print(data_without_out)