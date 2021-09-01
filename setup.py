import setuptools

with open("README.md", "r", encoding="utf-8") as fh:
    long_description = fh.read()

setuptools.setup(
    name="papanda",
    version="0.0.1a4",
    author="Ruslan Nazarov",
    author_email="runaz2007@gmail.com",
    description="Useful tools for statistical data exploration and detecting outliers",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/Ruslan-Nazarov/papanda",
    project_urls={
        "Bug Tracker": "https://github.com/Ruslan-Nazarov/papanda/issues",
    },
    classifiers=[
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
    ],
    package_dir={"": "src"},
    packages=setuptools.find_packages(where="src"),
    include_package_data=True,
    python_requires=">=3.8",
)