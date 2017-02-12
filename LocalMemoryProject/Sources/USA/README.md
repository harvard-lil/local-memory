# [Local Memory Project] US Dataset

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

## usa.json snippet
![example snippet of usa.json](https://github.com/harvard-lil/local-memory/blob/master/LocalMemoryProject/Sources/USA/usa.jsonSnippet.png)

[Local Memory Project]: <http://www.localmemory.org/>
[zipcodes.db]: https://github.com/fdintino/pyzipcode/tree/master/pyzipcode
[USNPL]: http://www.usnpl.com/