# July 2021
import numpy as np
import pandas as pd
import scipy.stats
import math

"""
Greenwood's criterion for detecting outliers in data.

Complaint ISO 16269-4:2010

Parameters
____________

data: array_like.

alpha: significance level (0.01 or 0.025), optional
    Default is 0.025.

Returns
____________

Greenwood's criterion, Critical value maximum, Critical value minimum, Result.

Example
____________

See example in func_examples.ipynb github

Notes
____________

The sample must obey an exponential distribution. The table shows the values for the significance level 0.025 and 0.01.
"""

def greenwood(data, alpha=0.025):
    table_criterion = pd.read_excel('greenwood_1.xlsx')
    low = "low " + str(alpha)
    up = "up " + str(alpha)
    n = len(data)
    n1 = n -1
    critical_value = table_criterion[table_criterion['n'] == n1][[low, up]]
    a = np.min(data)
    p = []
    n = len(data)
    for i in data:
        o = (i - a)**2
        p.append(o)
    summa = np.sum(p)
    z = []
    for ix in data:
        z1 = ix - a
        z.append(z1)
    summa1 = np.sum(z)
    b = (summa1)**2
    greenwood_criterion = summa / b

    if greenwood_criterion > critical_value.values[0,1]:
        outliers = 'Outliers among maximum values'
    if greenwood_criterion < critical_value.values[0,0]:
        outliers = 'Outliers among minimum or/and maximum values'
    
    print("Greenwood's criterion:{f}".format(f = greenwood_criterion))
    print()
    print("Critical value maximum: {f}".format(f = critical_value.values[0,1]))
    print()
    print("Critical value minimum: {f}".format(f = critical_value.values[0,0]))
    print()
    print('Result: {f}'.format(f = outliers))