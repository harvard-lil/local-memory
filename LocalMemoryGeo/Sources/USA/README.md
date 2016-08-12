# [Local Memory] US Dataset

# usa.json 
A collection of :
- **5,992 Newspapers**
- **1,061 TV stations**, and 
- **2,539 Radio stations**

data for the US.
# Sources
- [USNPL]
- [zipcodes.db]

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
        - **openSearch** (array[string])
            - (array)   
                - links to newspaper OpenSearch specification (string)
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
        - **openSearch** (array[string])
            - (array)   
                - links to tv OpenSearch specification (string)
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
        - **openSearch** (array[string])
            - (array)   
                - links to radio OpenSearch specification (string)
        - **Twitter**: twitter link (string)
        - **Facebook**: facebook link (string)
        - **Video**: video link (string)
        - **website**: radio station website (string)
        - **type**: format name e.g., Country, Contemporary (string)

## usa.json snippet
![example snippet of usa.json](https://github.com/harvard-lil/local-memory/blob/master/LocalMemoryGeo/Sources/USA/usa.jsonSnippet.png)

[Local Memory]: <http://librarylab.law.harvard.edu/sketches/local-memory>
[zipcodes.db]: https://github.com/fdintino/pyzipcode/tree/master/pyzipcode
[USNPL]: http://www.usnpl.com/