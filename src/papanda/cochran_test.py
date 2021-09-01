# September 2021
import numpy as np
import pandas as pd
import scipy.stats
import math
import pkgutil

"""
Cochran's test for detecting outliers in variances.

See details https://www.itl.nist.gov/div898/software/dataplot/refman1/auxillar/cochvari.htm

Complaint ISO 16269-4:2010

Parameters
____________

data: array_like.
    Obtained variances.

n: int.
    Amount observations from wich variances was computed.

alpha: significance level (0.05, 0.01 or 0.001), optional
    Default is 0.05.

Returns
____________

Critical_value, Cochran's criterion, Outliers.

Example
____________

See example in func_examples.ipynb github

Notes
____________

The table shows the values for the significance level 0.05, 
0.01, 0.001 for the number of variances from 2 to 40. 
In this case, the variances themselves should be determined 
from observations in the amount from 2 to 10.
"""

def cochran(data, n, alpha=0.05):
    data_pac = pkgutil.get_data(__name__, "datasets/cochran.xlsx") 
    cochran = pd.read_excel(data_pac)
    cochran = cochran.set_index(['alpha', 'p'])
    
    amount_variances = len(data) 
    critical_value = cochran.xs(alpha).xs(amount_variances)[n]
    c = np.max(data) / np.sum(data)
    if c > critical_value:
        outliers = np.max(data)
    else:
        outliers = 'No'
    print('Critical_value:{f}'.format(f=critical_value))
    print()
    print("Cochran's criterion: {f}".format(f=c))
    print()
    print("Outliers:{f}".format(f=outliers))