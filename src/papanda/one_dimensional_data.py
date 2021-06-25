"""
GESD test for detecting outliers

Parameters
____________

data: list.

alpha: significance level, optional
    Default is 0.05.

max_outliers: int

Returns
____________

DataFrame

Notes
____________

r: control statistics
l: critical valu

"""


def GESD(data, max_outliers, alpha=0.05):

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