# [Local Memory Project] Non-US Dataset

- **6,638 Newspapers** from
- **3,151 Cities** from
- **183 Countries**

# Source
- [Paperboy Online Newspapers US & World Newspapers]

## Properties of media in each city (source.json)
- **state-name** (string):
    - The name of the State in this form: "*StateName_StateNameAbbreviation*"
- **newspaper or tv or radio**:  (array[objects])
    - (object)
        - **name**: name of newspaper or tv or radio station (string)
        - **city-county-name**: name of city or county in which the newspaper is located (string)
        - **city-county-lat**: latitude of city-county-name  (float)
        - **city-county-long**: longitude of city-county-name (float)
        - **rss** (array[string])
            - (array)   
                - links to newspaper or tv or radio rss feeds (string)
        - **open-search** (array[string])
            - (array)   
                - links to newspaper or tv or radio specification (string)
        - **type**: 
            - city or county or college for newspaper (string)
            - format name e.g., Country, Contemporary for radio (string)
            - blank for tv (string)
        - **twitter**: twitter link (string)
        - **facebook** : facebook link (string)
        - **video**: video link (string)
        - **website**: newspaper or tv or radio website (string)

[Local Memory Project]: <http://www.localmemory.org/>
[Paperboy Online Newspapers US & World Newspapers]: https://www.thepaperboy.com/