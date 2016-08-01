# [Local Memory] US Dataset

# usa.json 
A collection of Newspapers, TV, and Radio station for the US

## Properties for each State
- **stateName** (string):
    - The name of the State in this form: "*StateName_StateNameAbbreviation*"
- **newspapers**:  (array[objects])
    - (object)
        - **newspaperName**: name of newspaper (string)
        - **cityCountyName**: name of city or county in which the newspaper is located (string)
        - **cityCountyNameLat**: latitude of cityCountyName  (float)
        - **cityCountyNameLong**: longitude of cityCountyName (float)
        - **rss** (array[string])
            - (array)   
                - links to newspaper rss feeds (string)
        - **type**: city or county or college newspaper (string)
        - **Twitter**: twitter link (string)
        - **Facebook** : facebook link (string)
        - **Video**: video link (string)
        - **website**: newspaper website (string)
- **tv**:  (array[objects])
    - (object)   
        - **tvStationName**: tv station name (string)
        - **cityCountyNameLat**: latitude of cityCountyName  (float)
        - **cityCountyNameLong**: longitude of cityCountyName (float)
        - **cityCountyName**: name of city or county in which the tv station is located (string)
        - **rss** (array[string]):
            - (array)
                - links to tv station rss feeds (string)
        - **Twitter**: twitter link (string)
        - **Facebook** : facebook link (string)
        - **Video**: video link (string)
        - **website**: tv station website (string)
- **radio**:  (array[objects])
    - (object) 
        - **radioStationName**: radio station name (string)
        - **cityCountyNameLat**: latitude of cityCountyName  (float)
        - **cityCountyNameLong**: longitude of cityCountyName (float)
        - **cityCountyName**: name of city or county in which the radio station is located (string)
        - **rss** (array[string]):
            - (array)
                - links to radio station rss feeds (string)
        - **Twitter**: twitter link (string)
        - **Facebook**: facebook link (string)
        - **Video**: video link (string)
        - **website**: radio station website (string)
        - **type**: format name e.g., Country, Contemporary (string)
        
[Local Memory]: <http://librarylab.law.harvard.edu/sketches/local-memory>