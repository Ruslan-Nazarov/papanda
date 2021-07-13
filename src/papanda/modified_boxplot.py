# July 2021
import numpy as np
import pandas as pd
import scipy.stats
import math

"""
Modified boxplot where the lower and upper quarters are used.

See details https://www.itl.nist.gov/div898/handbook/eda/section3/boxplot.htm

Complaint ISO 16269-4:2010

Parameters
____________

data: array_like.

alpha: significance level (0.05 or 0.01), optional
    Default is 0.05.

Returns
____________

outliers: array 
        Outliers in data.

Example
____________

See example in func_examples.ipynb github

Notes
____________

1) For normal distribution only
2) No preliminary estimate of the amount of emissions required
3) The table shows values only for samples from 9 to 500 values
"""




def boxplot(data, alpha = 0.05):
    data_boxplot = np.array(data)
    n = len(data_boxplot)
    criterion = n / 4
    """
    """
    i = np.modf(criterion)[1]
    if np.modf(criterion)[0] == 0:
        x_l = (data_boxplot[int(i-1)] + data_boxplot[int(i)]) / 2
        x_u = (data_boxplot[int(n-i-1)] + data_boxplot[int(n-i)]) / 2
    else:
        x_l = data_boxplot[int(i+1)]
        x_u = data_boxplot[int(n-i-1)]
    """
    """
    coef = pd.read_excel('coef.xlsx')
    coef['a'] = coef['a'].astype('str')
    coef['mod'] = coef['mod'].astype('str')
    coef['mod'] = coef['mod'].astype('str')
    coef = coef.set_index(['a', 'mod'])
    alpha = alpha
    if alpha == 0.05:
        y = np.mod(n, 4)
        if y == 0:
            b0, b1, b2, b3, b4 = coef.xs('0.05').xs('0')[0:5]

        if y == 1:
            b0, b1, b2, b3, b4 = coef.xs('0.05').xs('1')[0:5]

        if y == 2:
            b0, b1, b2, b3, b4 = coef.xs('0.05').xs('2')[0:5]

        if y == 3:
            b0, b1, b2, b3, b4 = coef.xs('0.05').xs('3')[0:5]
            
    else:
        y = np.mod(n, 4)
        if y == 0:
            b0, b1, b2, b3, b4 = coef.xs('0.01').xs('0')[0:5]
            
        if y == 1:
            b0, b1, b2, b3, b4 = coef.xs('0.01').xs('1')[0:5]
            
        if y == 2:
            b0, b1, b2, b3, b4 = coef.xs('0.01').xs('2')[0:5]
            
        if y == 3:
            b0, b1, b2, b3, b4 = coef.xs('0.01').xs('3')[0:5]
            
    k = np.exp(b0 + b1*np.log(n) + b2*((np.log(n))**2) + b3*((np.log(n))**3) + b4*((np.log(n))**4)) 
    L_f = x_l - (k * (x_u - x_l))
    U_f = x_u + (k * (x_u - x_l)) 
    outliers = data_boxplot[(data_boxplot < L_f) | (data_boxplot > U_f)]
    return outliers  