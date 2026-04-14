from setuptools import setup, find_packages

setup(
    name="flask-route-bridge",
    version="0.1.0",
    description="Flask integration for route-bridge - define routes once, use them anywhere",
    long_description=open("README.md").read() if __import__("os").path.exists("README.md") else "",
    long_description_content_type="text/markdown",
    author="route-bridge contributors",
    license="MIT",
    packages=find_packages(),
    python_requires=">=3.9",
    install_requires=[
        "flask>=2.3.0",
    ],
    extras_require={
        "dev": ["pytest", "pytest-flask"],
    },
    classifiers=[
        "Development Status :: 3 - Alpha",
        "Framework :: Flask",
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: MIT License",
    ],
)
