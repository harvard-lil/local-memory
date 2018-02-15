
var globalBaseURI = 'http://www.localmemory.org/';
var globalDebugFlag = false;
var globalEmbedCardClassName = 'embedlyCard'; //default: 'emded-card';
var globalNewsCollectionCount = -1;

var globalPayload = [];
var globalMaxPagesToVisit = 1;

var globalNewsCollection = {};
var globalNewsCollectionIndexer = 0;

//globalEditedCollection used by archiving method and save method, globalNewsCollection is canonical collection
var globalEditedCollectionCount = 0;
var globalEditedCollection = {};

//{tabid, tab}
var globalCurTabIDsDict = {};
/*
globalEditingFlag is true 
    1. when user is adding new website to collection
*/
var globalEditingFlag = false;
//used in uri naming scheme
var globalUniqueUserID = '';
var globalPvtID = '';

//globalMaxTabReadyCount: maximum times tab is checked before notifying incident
var globalMaxTabReadyCount = 5;
//globalTabReadyCount used to notify user when captcha might have occured (spinning until expected uri is captcha behaviour)
var globalTabReadyCount = 0;

/*
globalStopFlag used to stop search/archive, must be set to false after use
*/
var globalStopFlag = false;

/*Keeps track of app state such as saved*/
var globalAppState = {};


var globalGridfunctionPackage = 
{
    twitterButton: twitterButton,
    excludeLink: excludeLink,
    gridScrolling: gridScrolling,
    /*generateCards: generateCards,*/
    updateTableTitleLinks: updateTableTitleLinks
};

//for scolling - start
var globalGridScrollingActive = 'false';//default MUST be string 'false'
var globalGridTable = [];
//for scrolling - end

//for twitter - start
var globalTweetCollection = {};
var globalTweetCollectionPrevLength;
var globalAbortTweetConv = false;
//for twitter - end

// non-us site - 2 - start
var globalNonUSCountriesDict = {};
// non-us site - 2 - end

document.addEventListener('DOMContentLoaded', function()
{
    main();
});


chrome.tabs.onUpdated.addListener(function(tabid, info, tab)
{
    globalCurTabIDsDict[tabid] = tab;
});

function main()
{
    console.log('');
    console.log('main():');
    console.log('\tglobalDebugFlag: ', globalDebugFlag);

    if( globalDebugFlag == false )
    {
        window.onbeforeunload = function() { return ''; };
    }

    //CAUTION override globalUniqueUserID/globalPvtID - start
    
        /*
        var overrideGlobalUniqueUserID = '';
        chrome.storage.sync.set({userID: overrideGlobalUniqueUserID}, function()
        {
          console.log('\tsaved userID: ', overrideGlobalUniqueUserID);  
        });

        var overrideGlobalPvtID = '';
        chrome.storage.sync.set({pvtID: overrideGlobalPvtID}, function()
        {
          console.log('\tsaved pvtID: ', overrideGlobalPvtID);  
        });
        */
    //CAUTION override globalUniqueUserID/globalPvtID - end
    
    //config - start
    chrome.storage.sync.get('userID', function(items) 
    {
        if (items.userID !== undefined) 
        {
            globalUniqueUserID = items.userID;
        }
        console.log('\tglobalUniqueUserID: ', globalUniqueUserID);
    });

    chrome.storage.sync.get('pvtID', function(items) 
    {
        globalPvtID = items.pvtID;
        if (globalPvtID === undefined) 
        {
            globalPvtID = getRandomToken(100);
            chrome.storage.sync.set({pvtID: globalPvtID}, function()
            {
              console.log('\tsaved pvtID: ', globalPvtID);  
            });
        }
        console.log('\tglobalPvtID: ', globalPvtID);
    });
    //config - end

    var advBtn = document.getElementById("advBtn");
    advBtn.onclick = function()
    {
        if (document.getElementById('advMenu').style.display === 'none')
        {
            document.getElementById('advMenu').style.display = 'block';
            advBtn.innerHTML = 'ᐃ';

            if (globalNewsCollection.query)
            {
                //document.getElementById('newColDownloadFilename').value = globalNewsCollection.query;
                document.getElementById('newColDownloadFilename').value = getSavedQueryID();
                document.getElementById('setColName').value = globalNewsCollection.query;
            }
        }
        else
        {
            document.getElementById('advMenu').style.display = 'none';
            advBtn.innerHTML = 'ᐁ';
        }
    };

    //link input to enter key - start
    var idsToLinkToEnterKey = ['query', 'zipcode', 'sourceCount'];
    for (var i = 0; i < idsToLinkToEnterKey.length; i++)
    {
        var tag = document.getElementById(idsToLinkToEnterKey[i])
            .addEventListener("keyup", function(event)
            {
                event.preventDefault();
                if (event.keyCode == 13)
                {
                    if( !globalDebugFlag )
                    {
                        submitButtonClick();
                    }
                }
            });
    }
    //link input to enter key - end

    var countriesList = document.getElementById('country');
    countriesList.onclick = function()
    {
        if( Object.keys(globalNonUSCountriesDict).length == 0 )
        {
            createAlertMessageBoard('alert warning', 'loading countries, please wait...');
        }
    };
    
    // non-us site - 2 - start
    //init countries list - start
    if( !globalDebugFlag )
    {
        httpGet
        (
            globalBaseURI + 'api/countries/',
            function(dataReceived)
            {
                console.log('\tmain(): dataReceived');
                globalNonUSCountriesDict = dataReceived;
                console.log('\tglobalNonUSCountriesDict:', globalNonUSCountriesDict);

                for (var country in globalNonUSCountriesDict)
                {
                    var option = document.createElement('option');
                    option.value = country;
                    option.text = country;
                    countriesList.appendChild(option);
                }
                closeAlert();

                countriesList.onchange = function()
                {
                    populateCitiesForCountry(this.value);
                };
            },
            function(errorMessage)
            {
                console.log('\tError countries list: ' + errorMessage);
            }
        );
    }
    else
    {
        console.log('\tINIT countries list OFF');
    }
    //init countries list - end
    // non-us site - 2 - end

    document.getElementsByTagName('body')[0].onscroll = gridScrolling;
    
    document.getElementById('submitButton').onclick = function()
    {
        if( !globalDebugFlag )
        {
            submitButtonClick();
        }
    };

    document.getElementById('newColPlus').onclick = function()
    {
        userAddCollectionInputClick();
    };

    document.getElementById('newColAddButton').onclick = function()
    {
        userAddCollectionClick();
    };

    document.getElementById('tweetConvButton').onclick = function()
    {
        if( this.value === 'Extract tweets' )
        {
            this.value = 'Stop tweets extraction';
            globalAbortTweetConv = false;
            tweetConv();
        }
        else if( this.value === 'Stop tweets extraction' )
        {
            this.value = 'Stopping tweets extraction';
            globalAbortTweetConv = true;
        }
    };

    document.getElementById('colDownloadButton').onclick = function()
    {
        downloadColfileClick();
    };

    document.getElementById('submitMediaClick').onclick = function()
    {
        this.style.color = '#43007A';
        createAlertMessageBoard('alert info', 'To add a news media source please email: "anwala@cs.odu.edu" with subject: "LMP-Add", <br>to report an error, please use subject: "LMP-Error"');
    };

    document.getElementById('archiveButton').onclick = function()
    {
        //document.getElementById('advBtn').click();
        if( globalNewsCollection.query )
        {
            solicitSettingGlobalUniqueUserID('archiveIS');
        }
    };

    document.getElementById('saveRemotelyButton').onclick = function()
    {
        if (globalNewsCollection.query)
        {
            solicitSettingGlobalUniqueUserID();
        }
    };

    document.getElementById('setColNameButton').onclick = function()
    {
        if (globalNewsCollection.query)
        {
            var colName = document.getElementById('setColName').value;
            colName = colName.trim();
            colName = removeHTMLFromStr(colName);

            if( colName.length != 0 )
            {
                console.log('\tsetColNameButton, colName:', colName);
                globalNewsCollection['collection-name'] = colName;
            }
        }
    };

    document.getElementById('newColFile').addEventListener('change', uploadNewColfile, false);
    document.getElementById('showCardsChkbox').addEventListener('change', toggleCards, false);
    
    if( globalDebugFlag == false )
    {
        mapIPToZip();
    }

    if( globalDebugFlag )
    {
       document.getElementById('showCardsChkbox').checked = false; 
    }

}

function populateCitiesForCountry(country, city)
{
    if( country === 'USA' )
    {
        document.getElementById('zipcodeContainer').setAttribute('style', 'display:block');
        document.getElementById('citiesContainer').setAttribute('style', 'display:none');
    }
    else
    {
        if( globalNonUSCountriesDict[country] === undefined )
        {
            console.log('\tundefined country city list, will return');
            setTimeout(function()
            {
                populateCitiesForCountry(country, city);
            }, 2000);
            return;
        }

        document.getElementById('zipcodeContainer').setAttribute('style', 'display:none');
        document.getElementById('citiesContainer').setAttribute('style', 'display:block');
        var cities = document.getElementById('cities');
        cities.innerHTML = '';

        //populate cities for selected country: this.value
        for(var i = 0; i<globalNonUSCountriesDict[country].length; i++)
        {
            var option = document.createElement('option');
            option.value = globalNonUSCountriesDict[country][i];
            option.text = globalNonUSCountriesDict[country][i];
            cities.appendChild(option);
        }

        if( city !== undefined )
        {
            document.getElementById('country').value = country;
            document.getElementById('cities').value = city;
        }
    }
}

//iso8601DateStr: '2016-09-17T17:38:00Z'
function specialDateFormat(iso8601DateStr)
{
    var weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    var monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    var datetime = new Date(iso8601DateStr);
    var timezone = datetime + '';
    timezone = '(' + timezone.split(' (')[1];

    var hours = datetime.getHours();
    var suffix = (hours >= 12)? 'PM' : 'AM';
    hours = ((hours + 11) % 12 + 1);

    var minutes = datetime.getMinutes() + '';
    if( minutes.length == 1 )
    {
        minutes = '0' + minutes;
    }

    return weekday[datetime.getDay()] + ', ' + 
    monthNames[datetime.getMonth()] + ' ' + 
    datetime.getDate() + ', ' + datetime.getFullYear() + ', ' + 
    hours + ':' + minutes + ' ' +  suffix + ' ' + timezone;
}

function getDatestamp_obsolete()
{
    var datestamp = new Date();
    var yyyy, MM, dd, hh, mm, ss;

    yyyy = datestamp.getFullYear();
    MM = (datestamp.getMonth()+1) + '';
    
    if( MM.length == 1 )
    {
        MM = '0' + MM;
    }

    dd = datestamp.getDate() + '';
    if( dd.length == 1 )
    {
        dd = '0' + dd;
    }

    hh = datestamp.getHours() + '';
    if( hh.length == 1 )
    {
        hh = '0' + hh;
    }

    mm = datestamp.getMinutes() + '';
    if( mm.length == 1 )
    {
        mm = '0' + mm;
    }

    ss = datestamp.getSeconds() + '';
    if( ss.length == 1 )
    {
        ss = '0' + ss;
    }

    //datestamp =  yyyy + MM + dd + hh + mm + ss; this leads to unstable uri
    datestamp =  yyyy + MM + dd;
    return datestamp;
}

function solicitSettingGlobalUniqueUserID(sender, msg)
{
    //set globalUniqueUserID to authorNameInput
    
    if( sender == undefined )
    {
        sender = '';
    }

    if( msg == undefined )
    {
        msg = '';
    }

    var parentDiv = document.createElement('div');
    parentDiv.className = 'pure-form pure-form-stacked';

    var msgSpan = document.createElement('span');
    msgSpan.id = 'authorSetResponseMsg';
    msgSpan.style = 'color: red;';
    msgSpan.innerHTML = msg;
    var fieldSet = document.createElement('fieldset');

    var pureGDiv = document.createElement('div');
    pureGDiv.className = 'pure-g';
    pureGDiv.title = 'Only numbers and letters and spaces allowed.';


    //authorNameInput - start
    var authorNameInputContainer = document.createElement('div');
    authorNameInputContainer.className = 'pure-u-1 pure-u-md-1-2';

    var authorNameInputLabel = document.createElement('label');
    authorNameInputLabel.innerHTML = 'Author (*)';
    var authorNameInput = document.createElement('input');
    authorNameInput.className = 'pure-u-23-24';
    authorNameInput.id = 'authorNameInput';
    authorNameInput.value = globalUniqueUserID;
    authorNameInput.setAttribute('maxlength', '20');
    authorNameInput.required = true;

    authorNameInputContainer.appendChild(authorNameInputLabel);
    authorNameInputContainer.appendChild(authorNameInput);
    //authorNameInput - end

    //collectionNameInput - start
    var collectionNameInputContainer = document.createElement('div');
    collectionNameInputContainer.className = 'pure-u-1 pure-u-md-1-2';

    var collectionNameInputLabel = document.createElement('label');
    collectionNameInputLabel.innerHTML = 'Collection name';
    var collectionNameInput = document.createElement('input');
    collectionNameInput.className = 'pure-u-23-24';
    collectionNameInput.id = 'collectionNameInput';
    //standard schema - 3
    if( globalNewsCollection['collection-name'] )
    {
        collectionNameInput.value = globalNewsCollection['collection-name'];
    }
    collectionNameInput.setAttribute('sender', sender);

    collectionNameInputContainer.appendChild(collectionNameInputLabel);
    collectionNameInputContainer.appendChild(collectionNameInput);
    //collectionNameInput - end

    //set - start
    var setCustColnameInput = document.createElement('input');
    setCustColnameInput.className = 'pure-button pure-button-primary';
    setCustColnameInput.value = 'Save';
    setCustColnameInput.type = 'submit';

    setCustColnameInput.onclick = function()
    {
        console.log('\nsolicitSettingGlobalUniqueUserID():');
        
        var collectionNameInput = document.getElementById('collectionNameInput');
        var sender = collectionNameInput.getAttribute('sender');
        console.log('\tsender:', sender);

        collectionNameInput = removeHTMLFromStr(collectionNameInput.value);
        //standard schema - 4
        //globalNewsCollection.collectionName = collectionNameInput;
        globalNewsCollection['collection-name'] = collectionNameInput;

        if( globalUniqueUserID.length != 0 )
        {
            console.log('\texisting user');
            //existing user
            if( sender == 'archiveIS' )
            {
                saveRemotely(archiveIS);
            }
            else
            {
                saveRemotely(saveRemoteGenericResponseHandler);
            }

            document.getElementById("myModalClose").click();
        }
        else
        {
            //new user, get author name
            console.log('\tnew user');

            var authorNameInput = document.getElementById('authorNameInput').value;
            authorNameInput = removeHTMLFromStr(authorNameInput);
            authorNameInput = slugify(authorNameInput, '');

            if( authorNameInput.length == 0 )
            {
                document.getElementById('authorSetResponseMsg').innerHTML = 'Please set author name.';
                return;
            }

            document.getElementById('authorSetResponseMsg').innerHTML = 'Checking if name author name exist, please wait...';
            httpGet
            (
                globalBaseURI + 'authors/' + authorNameInput + '/',
                function(dataReceived)
                {
                    document.getElementById('authorSetResponseMsg').innerHTML = '';
                    console.log('\tdataReceived:', dataReceived);
                    if( dataReceived.msg == 'True' )
                    {
                        document.getElementById('authorSetResponseMsg').innerHTML = authorNameInput + ' is not available, please choose another name.';
                    }
                    else if( dataReceived.msg == 'False' )
                    {
                        //here means authorNameInput is good, so set globalUniqueUserID - start
                        globalUniqueUserID = authorNameInput;
                        chrome.storage.sync.set({userID: authorNameInput}, function()
                        {
                          console.log('\tsave user id: ', authorNameInput);  
                        });
                        //here means authorNameInput is good, so set globalUniqueUserID - end
                        
                        if( sender == 'archiveIS' )
                        {
                            saveRemotely(archiveIS);
                        }
                        else
                        {
                            saveRemotely(saveRemoteGenericResponseHandler);
                        }
                        document.getElementById("myModalClose").click();
                    }
                    else
                    {
                        document.getElementById('authorSetResponseMsg').innerHTML = 'Sorry, an error occured on the server. Please try again later.';
                    }
                },
                function(errorMessage)
                {
                    console.log('\terror saving:', errorMessage);
                    document.getElementById('authorSetResponseMsg').innerHTML = 'Sorry, an error occured on the client. Please try again later.';
                }
            );
        }
    };
    //set - end
    
    pureGDiv.appendChild(authorNameInputContainer);
    pureGDiv.appendChild(collectionNameInputContainer);
    pureGDiv.appendChild(setCustColnameInput);
    fieldSet.appendChild(pureGDiv);
    parentDiv.appendChild(msgSpan);
    parentDiv.appendChild(fieldSet);

    modal('Set Collection Author Name', parentDiv, '40%');
}

//credit: http://www.w3schools.com/howto/howto_css_modals.asp
function modal(modalTitle, bodyContentDiv, modalWidth)
{
    console.log('\nmodal():');
    if( modalTitle == undefined )
    {
        modalTitle = '';
    }

    if( modalWidth == undefined )
    {
        modalWidth = '80%';
    }
    
    var modal = document.getElementById('myModal');
    var closeSpan = document.getElementById("myModalClose");
    document.getElementById('modalTitle').innerHTML = modalTitle;

    document.getElementsByClassName("modal-body")[0].innerHTML = '';
    document.getElementsByClassName("modal-body")[0].appendChild(bodyContentDiv);
    document.getElementsByClassName("modal-content")[0].style.width = modalWidth;

    modal.style.display = "block";
    
    closeSpan.onclick = function()
    {
        modal.style.display = "none";
    };

    window.onclick = function(event)
    {
        if (event.target == modal)
        {
            modal.style.display = "none";
        }
    }
}

function twitterButton()
{
    console.log('');
    console.log('twitterButton():');

    var tweetInLink = '';
    if( globalNewsCollection.collection )
    {
       if( globalNewsCollection.collection.length != 0 )
       {
            //var archivedLink = encodeURIComponent(archiveISGetCollectionArchivedURL());
            //new schema
            var savedLink = encodeURIComponent(getRemoteSavedURI());
            var firstLink = '';

            for(var i=0; i<globalNewsCollection.collection.length; i++)
            {
                for(var j=0; j<globalNewsCollection.collection[i].links.length; j++)
                {
                    if( globalNewsCollection.collection[i].links[j].link )
                    {
                        firstLink = globalNewsCollection.collection[i].links[j].link;
                        break;
                    }
                }

                if( firstLink.length != 0 )
                {
                    break;
                }
            }

            /*
            tweetInLink = 'https://twitter.com/intent/tweet?text=.%40localmem%20my%20collection%20%22' + 
            encodeURIComponent(globalNewsCollection.query) + '%22:%20' + savedLink + '%20' + 
            encodeURIComponent(firstLink) + '&hashtags=localmemory';
            */

            tweetInLink = 'https://twitter.com/intent/tweet?text=.%40localmem%20my%20collection%20%22' + 
            encodeURIComponent(globalNewsCollection.query) + 
            '%22' + encodeURIComponent(', ' + globalNewsCollection.city + 
            ', ' + globalNewsCollection.state) + ':%20' + savedLink + '%20' + 
            encodeURIComponent(firstLink) +'&hashtags=localmemory';
       }
    }

    if( tweetInLink.length == 0 )
    {
        tweetInLink = 'https://twitter.com/intent/tweet?text=I love local memory&hashtags=localmemory';
        tweetInLink = encodeURI(tweetInLink);
    }
    
    var container = document.getElementById('tweetShareContainer');
    container.innerHTML = '';
    
    //make <a class="twitter-share-button" id="tweetLink" data-size="large" href=""></a>
    var tweetShareButton = document.createElement('a');
    tweetShareButton.className = 'twitter-share-button';
    tweetShareButton.href = tweetInLink;
    tweetShareButton.setAttribute('data-size', 'large');

    container.appendChild(tweetShareButton);

    window.twttr = (function(d, s, id)
    {
        var js, fjs = d.getElementsByTagName(s)[0],
            t = window.twttr ||
            {};

        js = d.createElement(s);
        js.id = id;
        js.src = "https://platform.twitter.com/widgets.js";
        fjs.parentNode.insertBefore(js, fjs);

        t._e = [];
        t.ready = function(f)
        {

            t._e.push(f);
        };

        t.ready(function (t) 
        {
          t.events.bind('tweet', function(event) 
          {
            if( globalAppState.savedRemotelyFlag != true )
            {
                solicitSettingGlobalUniqueUserID('', 'Please save so the collection you shared would be available.');
            }

          });

        });

        return t;
    }(document, "script", "twitter-wjs"));
}

function mapIPToZip()
{
    httpGet
        (
            globalBaseURI + 'api/ip/',
            function(dataReceived)
            {
                console.log('\tmapIPToZip(): IP dataReceived');
                var requestURI = 'https://freegeoip.net/json/' + dataReceived['ip'];

                httpGet
                    (
                        requestURI,
                        function(dataReceived)
                        {
                            console.log('\tmapIPToZip(): zipcode dataReceived');
                            console.log('\t', dataReceived);

                            dataReceived.zip_code = dataReceived.zip_code.trim();
                            if (isNaN(dataReceived.zip_code) === false && document.getElementById('zipcode').value.trim().length == 0)
                            {
                                /*
                                globalGeoParameters.city = dataReceived.city.trim();
                                globalGeoParameters.region_name = dataReceived.region_name.trim();
                                globalGeoParameters.country_name = dataReceived.country_name.trim();
                                */
                                document.getElementById('zipcode').value = dataReceived.zip_code;
                            }
                        },
                        function(errorMessage)
                        {
                            console.log('\tmapIPToZip(): zipcode: ' + errorMessage);
                        }
                    );

            },
            function(errorMessage)
            {
                console.log('\tmapIPToZip(): Error: ' + errorMessage);
            }
        );
    //freegeoip.net/{format}/{IP_or_hostname}
    //http://freegeoip.net/?q=140.247.0.128
    //http://www.geoplugin.com/: 120/min
    //http://ip-api.com/docs/: 150/min
    //https://ipapi.co/#api: 1000/day
}

function getRandomToken(k)
{
    if(k === undefined || k < 1 )
    {
        k = 20;
    }
    var randToken = '';
    var alphabet = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

    for(var i=0; i<k; i++)
    {
        //rand beteen 0 and k inclusive
        var randIndex = Math.floor(Math.random() * alphabet.length);
        var token = alphabet[randIndex];

        //coin toss
        if( Math.floor((Math.random() * 2)) == 0 )
        {
            token = token.toLowerCase();
        }

        randToken += token;
    }

    return randToken;
}


function removeNonAlpha_obsolete(str)
{
    if( str === undefined )
    {
        return '';
    }

    var letterNumber = /^[0-9a-zA-Z]+$/;
    var result = '';
    for(var i=0; i<str.length; i++)
    {
        if( str[i].match(letterNumber) )
        {
            result = result + str[i];
        }
    }

    return result;
}

//credit: https://gist.github.com/mathewbyrne/1280286
function slugify(text, lowerCaseOffFlag)
{   
    text = text.toString();

    if( lowerCaseOffFlag == undefined )
    {
        text = text.toLowerCase();
    }
    
    return text.replace(/\s+/g, '-')    // Replace spaces with -
        .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
        .replace(/\-\-+/g, '-')         // Replace multiple - with single -
        .replace(/^-+/, '')             // Trim - from start of text
        .replace(/-+$/, '');            // Trim - from end of text
}

function getRequestID(country, zipcode, query, sourceCount)
{
    if( country === undefined )
    {
        country = '';
    }

    if( zipcode === undefined )
    {
        zipcode = '';
    }

    if( query === undefined )
    {
        query = '';
    }

    if( sourceCount === undefined )
    {
        sourceCount = '';
    }
    sourceCount = sourceCount + '';

    country = country.substr(0, 50);
    //zipcode = zipcode.substr(0, 6);
    query = query.substr(0, 100);
    sourceCount = sourceCount.substr(0, 3);

    return slugify(country + ' ' + zipcode + ' ' + query + ' ' + sourceCount);
}

//scrolling - start
//credit: http://stackoverflow.com/a/488073
function isScrolledIntoView(el) 
{
    var elemTop = el.getBoundingClientRect().top;
    var elemBottom = el.getBoundingClientRect().bottom;

    //var isVisible = (elemTop >= 0) && (elemBottom <= window.innerHeight);
    var isVisible = (elemTop <= window.innerHeight);
    return isVisible;
}

function gridScrolling()
{
    console.log('\ngridScrolling()');

    if( globalNewsCollection.collection === undefined )
    {
        console.log('\treturning, globalNewsCollection.collection undefined');
        return;
    }

    var showCardsChkbox = document.getElementById('showCardsChkbox');
    if ( showCardsChkbox )
    {
        if( showCardsChkbox.checked == false )
        {
            console.log('\treturning, cards off');
            return;
        }
    }

    if( globalGridScrollingActive.length === 0 )
    {
        console.log('\treturning, globalGridScrollingActive.length = 0');
        return;
    }

    if( globalGridScrollingActive === 'true' )
    {
        console.log('\treturning, globalGridScrollingActive = true');
        return;
    }

    if( globalGridTable.length == 0 )
    {
        globalGridTable = document.getElementsByClassName('gridtable');
    }

    if( globalGridTable.length === 0 )
    {
        console.log('\treturning, globalGridTable.length = 0');
        return;
    }

    
    globalGridScrollingActive = 'true';
    //set embedly defaults - start
    embedly("defaults",
    {
        cards:
        {
            width: '80%'
        }
    });
    //set embedly defaults - end
    
    var cells = globalGridTable[0].getElementsByTagName('td');
    for( var i=0; i<cells.length; i++)
    {
        if( cells[i].className !== 'newsHeading' && isScrolledIntoView(cells[i]) && cells[i].getAttribute('genCard') !== 'true' )
        {
            cells[i].setAttribute('genCard', 'true');
            var toGenCard = cells[i].getElementsByClassName(globalEmbedCardClassName)[0];
            embedly('card', toGenCard);
        }
    }
    globalGridScrollingActive = 'false';
}
//scrolling - end

//twitter conversation - start
function tweetConv()
{
    console.log('\ntweetConv():');
    var tweetConvURI = document.getElementById('tweetConvURI').value;
    tweetConvURI = tweetConvURI.trim();
    var tweetConvMaxTweetCount = document.getElementById('tweetConvMaxTweetCount').value;
    
    
    if( tweetConvURI.length == 0 )
    {
        alert('Please enter a valid URL.');
        return;
    }

    window.scrollTo(0, 0);
    console.log('\ttweetConvURI:', tweetConvURI);
    console.log('\ttweetConvMaxTweetCount:', tweetConvMaxTweetCount);
    
    chrome.tabs.query({active: true}, function(parentTabs)
    {
        if( parentTabs.length != 0 )
        {
            chrome.windows.create(
            {
                url: tweetConvURI,
                left: Math.round(parentTabs[0].width),
                top: Math.round(parentTabs[0].height),
                width: 840,
                height: 380
            },
            function(window)
            {
                console.log('\twindow:', window);
                chrome.tabs.query({active: true, windowId: window.id}, function(parentTabs)
                {
                    if( parentTabs.length != 0 )
                    {
                        //update tab state asap - start
                        setTimeout(function()
                        {
                            chrome.tabs.get(parentTabs[0].id, function(tab)
                            { 
                                console.log('\tcreated taburl/status/id: ', tab.url, tab.status, tab.id);
                                //early update of tab state before chrome.tabs.onUpdated() called
                                createAlertMessageBoard('alert', 'Please don\'t close or minimize or hide tweet window.');

                                globalCurTabIDsDict[tab.id] = tab;
                                initGetDescendantsForTab(tab, tweetConvURI, tweetConvMaxTweetCount, 0);
                            });
                        }, 2000);
                        //update tab state asap - end
                    }
                });
            });
        }
    });
}

function initGetDescendantsForTab(tab, expectedTabURI, tweetConvMaxTweetCount, noMoreTweetCounter)
{
    console.log('\ninitGetDescendantsForTab():');
    console.log('\tglobalTabReadyCount: ', globalTabReadyCount);

    if( globalTabReadyCount > 100 )
    {
        globalTabReadyCount = globalMaxTabReadyCount + 1;
    }

    //fix stale page problem that confuses captcha - start
    if( globalTabReadyCount === globalMaxTabReadyCount-2 )
    {
        chrome.tabs.reload(tab.id);
    }
    //fix stale page problem that confuses captcha - end

    if( globalTabReadyCount > globalMaxTabReadyCount )
    {
        closeAlert();
        createAlertMessageBoard('alert', 'Attention required: Please refresh.');
    }

    if( isTabReady(tab, expectedTabURI) == false )
    {
        globalTabReadyCount++;
        setTimeout(function()
        {
            initGetDescendantsForTab(tab, expectedTabURI, tweetConvMaxTweetCount, noMoreTweetCounter);
        }, 1000);
        
        return;
    }

    //update tab
    globalTabReadyCount = 0;
    tab = globalCurTabIDsDict[tab.id];
    globalTweetCollectionPrevLength = Object.keys(globalTweetCollection).length;

    closeAlert();
    createAlertMessageBoard('alert', 'Please don\'t close or minimize or hide tweet window. Extracted ' + globalTweetCollectionPrevLength + ' tweets.');

    console.log('\nback to initGetDescendantsForTab():');
    console.log('\tglobalTweetCollectionPrevLength:', globalTweetCollectionPrevLength);
    console.log('\tnoMoreTweetCounter:', noMoreTweetCounter);
    
    if( globalAbortTweetConv )
    {
        console.log('\t\tUser abort detected.');
        serveDescendants(expectedTabURI, tab);
        return;
    }

    //get descendants - start
     chrome.tabs.executeScript(tab.id,
    {
        file: "./scripts/non-local-cols/twitter-conv/click-show-more.js"
    }, function(result)
    {
        chrome.tabs.executeScript(tab.id,
        {
            file: "./scripts/non-local-cols/twitter-conv/get-tweets.js"
        }, function(result)
        {   
            //until( x number of children extracted and or no more children )
            result = result[0];
            for(var tweetId in result)
            {
                if( tweetConvMaxTweetCount == 0 )
                {
                    //indicates unrestricted descendants length
                    globalTweetCollection[tweetId] = result[tweetId];
                }
                else if( Object.keys(globalTweetCollection).length < tweetConvMaxTweetCount )
                {
                    globalTweetCollection[tweetId] = result[tweetId];
                }
                else
                {
                    console.log('\t\treached threshold');
                    serveDescendants(expectedTabURI, tab);
                    return;
                }
            }

            if( globalAbortTweetConv )
            {
                console.log('\t\tUser abort detected.');
                serveDescendants(expectedTabURI, tab);
                return;
            }

            if( globalTweetCollectionPrevLength == Object.keys(globalTweetCollection).length )
            {
                noMoreTweetCounter++;
            }
            else
            {
                noMoreTweetCounter = 0;
            }

            if( noMoreTweetCounter > 2 )
            {
                console.log('\t\tno more tweets, breaking');
                serveDescendants(expectedTabURI, tab);
                return;
            }

            setTimeout(function()
            {
                console.log('\t\tscrolling');
                chrome.tabs.executeScript(tab.id,
                {
                    file: "./scripts/non-local-cols/twitter-conv/scroll-down.js"
                }, function(result)
                {
                    //scroll to possible load more tweets
                    initGetDescendantsForTab(tab, expectedTabURI, tweetConvMaxTweetCount, noMoreTweetCounter);
                });
            }, 2000);

        });
    });
    //get descendants - end
}

function formatTweetTime(tweetTimeStr)
{
    var tweetTime = '';
    //tweetTimeStr format: 5:46 PM - 23 Feb 2017
    tweetTimeStr = tweetTimeStr.trim().split('-');
    
    if( tweetTimeStr.length > 1 )
    {
        tweetTimeStr = tweetTimeStr[1].trim().split(' ');
        if( tweetTimeStr.length > 2 )
        {
            tweetTime = tweetTimeStr[1] + ' ' + tweetTimeStr[0] + ' ' + tweetTimeStr[2];
        }
    }

    return tweetTime;
}

function serveDescendants(tweetRequestURI, tab)
{
    console.log('\nserveDescendants():');
    if( !tweetRequestURI || !tab )
    {
        return;
    }
    //embedly, grid not scroll for short 

    //construct query from twitter uri - start
    var constructedQuery = 'query-NA';
    
    if( tweetRequestURI.indexOf('https://twitter.com/search') === 0 )
    {
        var tempQuery = getParameterByName('q', tweetRequestURI);
        if( tempQuery.length != 0 )
        {
            constructedQuery = 'twitter-search-' + tempQuery;
        }
    }
    else if( tweetRequestURI.indexOf('https://twitter.com/') === 0 )
    {
        constructedQuery = 'twitter';
        var aTag = document.createElement('a');
        aTag.href = tweetRequestURI;

        if( aTag.pathname.length > 1 )
        {
            constructedQuery = constructedQuery + aTag.pathname.replace(/\//g, '-');
        }
    }
    //construct query from twitter uri - end

    
    var tweetsCount = Object.keys(globalTweetCollection).length;
    closeAlert();
    createAlertMessageBoard('alert success', 'Extracted ' + tweetsCount + ' tweets.');
    setTimeout(function()
    {
        closeAlert();
    }, 5000);

    globalNewsCollection = getLMPCollectionScaffoldDict
    (
        'Twitter', 
        tweetsCount, 
        constructedQuery,
        ''
    );

    globalNewsCollection['self-collection'] = [{deleted: false, 'search-uri': tab.url}];
    for(var tweetId in globalTweetCollection)
    {
        /*
        for(var tweetAttr in globalTweetCollection[tweetId])
        {
            console.log(tweetAttr, globalTweetCollection[tweetId][tweetAttr]);
        }
        console.log('');
        */
        
        var tempDict = {};
        tempDict['crawl-datetime'] = formatTweetTime(globalTweetCollection[tweetId]['tweet-time']);//tweet-time format: 5:46 PM - 23 Feb 2017
        tempDict['rank'] = 0;
        tempDict['page'] = 0;
        tempDict['link'] = 'https://twitter.com/'+ globalTweetCollection[tweetId]['data-screen-name'] +'/status/' + globalTweetCollection[tweetId]['data-tweet-id'];
        tempDict['snippet'] = globalTweetCollection[tweetId]['tweet-text'];
        tempDict['title'] = globalTweetCollection[tweetId]['data-name'] + ' ('+ globalTweetCollection[tweetId]['data-screen-name'] +')';
        tempDict['custom'] = {'tweet-raw-data': globalTweetCollection[tweetId]};
        globalNewsCollection.collection[0].links.push(tempDict);
    }

    console.log('\tglobalNewsCollection:', globalNewsCollection);
    document.getElementById("advBtn").click();
    drawGrid
    (
        localNewsCollections=globalNewsCollection, 
        columnCount=5, 
        uniqueUserID=globalUniqueUserID, 
        embedCardClassName=globalEmbedCardClassName,
        globalGridfunctionPackage
    );

    //reset state for new conversation extraction - start
    //document.getElementById('tweetConvButton').disabled = false;
    document.getElementById('tweetConvButton').value = 'Extract tweets';
    globalAbortTweetConv = false;
    globalTweetCollection = {};
    //reset state for new conversation extraction - end

    setTimeout(function()
    {
        chrome.tabs.remove(tab.id, null);
    }, 1000);

}
//twitter conversation - end

//vary non-local search query - start
//vary non-local search query - start

function getLMPCollectionScaffoldDict(nonLocalName, globalMaxPagesToVisit, query, zipcode)
{
    //for genSearchColSource definition, see single collection in http://www.localmemory.org/api/USA/02138/10/
    if( nonLocalName.length != 0 )
    {
        nonLocalName = '-' + nonLocalName;
    }

    var genSearchColSource = {};
    genSearchColSource.facebook = '';
    genSearchColSource.twitter = '';
    genSearchColSource.video = '';
    genSearchColSource['city-county-name'] = '';
    genSearchColSource['city-county-lat'] = 0;
    genSearchColSource['city-county-long'] = 0;
    genSearchColSource.country = '';
    genSearchColSource.miles = 0;
    genSearchColSource.name = 'non-Local' + nonLocalName;
    genSearchColSource['open-search'] = [];
    genSearchColSource.rss = [];
    genSearchColSource.state = '';
    genSearchColSource['media-class'] = 'multiple media';
    genSearchColSource['media-subclass'] = '';
    genSearchColSource.website = '';

    //for newsCollection and newsCollection.collection.links[i] definition see lmp.exn
    newsCollection = {};
    newsCollection['city-latitude'] = 0;
    newsCollection['city-longitude'] = 0;
    newsCollection.city = '';
    newsCollection.collection = [{source: genSearchColSource, links: []}];
    newsCollection.country = '';
    newsCollection['maximum-links-per-source'] = globalMaxPagesToVisit;
    newsCollection.query = query;
    newsCollection['self-lmg'] = '';
    newsCollection.state = '';
    newsCollection.timestamp = new Date().toISOString();
    newsCollection.zipcode = zipcode;
    newsCollection['self-collection'] = [];

    return newsCollection;
}

// non-us site - 3
//google backbone - start
function submitButtonClick()
{
    var country = document.getElementById('country').value;
    var query = document.getElementById('query').value.trim();
    var zipcode = document.getElementById('zipcode').value.trim();
    var sourceCount = document.getElementById('sourceCount').value;
    sourceCount = +sourceCount;

    console.log('');
    console.log('submitButtonClick():');
    console.log('\tcountry: ', country);
    console.log('\tquery: ', query);
    console.log('\tzipcode: ', zipcode);
    console.log('\tsourceCount: ', sourceCount);
    console.log('\tAdvanced Options - ');

    var maximumPages = document.getElementById('maximumPages').value;

    if (maximumPages < 1)
    {
        maximumPages = 1;
    }
    globalMaxPagesToVisit = maximumPages;

    console.log('\tmaximumPages: ', maximumPages);

    if (query.length == 0)
    {
        alert('Please enter a valid query.');
        return;
    }

    if( zipcode.length == 0 && country == 'USA' )
    {
        alert('Please enter a valid zipcode.');
        return;
    }

    if (sourceCount < 1)
    {
        alert('Please enter a valid source count.');
        return;
    }

    createAlertMessageBoard('alert warning', '...please wait');

    if( zipcode == '0' )
    {
        //reset state - start
        console.log('\tsubmitButtonClick(): reset globalAppState');
        globalAppState = {};
        globalAppState.nonLocalFlag = true;
        //reset state - end

        zipcode = '';//*

        var nonLocalName = '';
        var indexOfSiteParam = query.indexOf('site:');
        if( indexOfSiteParam !== -1 )
        {
            globalAppState.nonLocalSiteParam = query.substr(indexOfSiteParam, query.length-1).trim();
            nonLocalName = '-' + globalAppState.nonLocalSiteParam.replace('site:', '').trim();;
            globalAppState.nonLocalSiteParam = globalAppState.nonLocalSiteParam.toLowerCase();
        }

        globalNewsCollection = getLMPCollectionScaffoldDict(nonLocalName, +globalMaxPagesToVisit, query, zipcode);

        closeAlert();
        createAlertMessageBoard('alert warning', '...searching, please do not close search tab', true);
        document.getElementById('submitButton').disabled = true;

        googleGetSERPResults();
    }
    else
    {
        var requestURI;
        if( country === 'USA' )
        {
            requestURI = globalBaseURI + 'api/countries/' + country + '/' + zipcode + '/' + sourceCount + '?off=radio';
        }
        else
        {
            zipcode = '';
            requestURI = globalBaseURI + 'api/countries/' + country + '/' + document.getElementById('cities').value + '/' + sourceCount + '?off=radio';
        }

        httpGet
        (
            requestURI,
            function(dataReceived)
            {
                console.log('\tsubmitButtonClick(): dataReceived');

                //uniform representation - start
                dataReceived.query = query;
                dataReceived.zipcode = zipcode;
                //standard schema - 5
                dataReceived['maximum-links-per-source'] = sourceCount;
                dataReceived['self-lmg'] = dataReceived.self;
                
                delete dataReceived.self;
                for(var i=0; i<dataReceived.collection.length; i++)
                {
                    dataReceived.collection[i] = {source: dataReceived.collection[i], links: []};
                }
                //uniform representation - end

                //reset state - start
                console.log('\tsubmitButtonClick(): reset globalAppState');
                globalAppState = {};
                //reset state - end

                closeAlert();
                if (dataReceived.collection.length != 0)
                {
                    createAlertMessageBoard('alert warning', '...searching, please do not close search tab', true);
                    document.getElementById('submitButton').disabled = true;
                }
                else
                {
                    createAlertMessageBoard('alert info', 'No results.');
                    setTimeout(function()
                    {
                       closeAlert();
                    }, 2000);
                }

                globalNewsCollection = dataReceived;
                googleGetSERPResults();
            },
            function(errorMessage)
            {
                closeAlert();
                createAlertMessageBoard('alert', 'Sorry, an error occurred because your application may be out of date. <a href="http://www.localmemory.org" target="_blank">Please update your application.</a>');
            }
        );
    }
}

function googleGetSERPResults()
{
    console.log('');
    console.log('googleGetSERPResults():');

    if( globalNewsCollection.collection === undefined )
    {
        console.log('\tundefined collection');
        return;
    }

    if (globalNewsCollection.collection.length == 0)
    {
        console.log('\tempty collection');
        return;
    }

    var uri = '';
    if( globalAppState.nonLocalFlag )
    {
        console.log('\tnon-Local search');
        uri = googleGetSearchURI(globalNewsCollection.query, 1);
    }
    else
    {
        console.log('\tLocal search');
        var domain = globalNewsCollection.collection[0].source.website;
        domain = getDomain(domain);
        uri = googleGetSearchURI(globalNewsCollection.query + ' site:' + domain, 1);
    }
    
    console.log('\tquery:', globalNewsCollection.query);
    console.log('\turi: ', uri);

    var delay = document.getElementById('googleDelay').value;
    if(delay < 2 || delay > 60 )
    {
        delay = 2;
    }
    delay = delay * 1000;

    chrome.tabs.query({'active': true}, function(parentTabs)
    {
        if( parentTabs.length != 0 )
        {
            chrome.tabs.create(
            {
                'url': uri,
                'index': parentTabs[0].index + 1,
                'active': false
            },
            function(childTab)
            {
                //update tab state just in case state changed after creation, e.g., google capture, so wait a little (captcha detection helper) - start
                console.log('\tsleep: ', delay);
                setTimeout(function()
                {
                    chrome.tabs.get(childTab.id, function(tab)
                    { 
                        console.log('\tcreated taburl/status/id: ', tab.url, tab.status, tab.id);
                        //early update of tab state before chrome.tabs.onUpdated() called
                        globalCurTabIDsDict[tab.id] = tab;
                        processHTMLForTab(tab, uri, 1);
                    });
                }, delay);
                //update tab state just in case state changed after creation, e.g., google capture, so wait a little (captcha detection helper) - end

            });
        }
    });
}

function openURITab(tab, query, page)
{
    var uri = googleGetSearchURI(query, page);

    console.log('');
    console.log('openURITab():');
    console.log('\tpage: ', page, ' of ', globalMaxPagesToVisit);

    var delay = document.getElementById('googleDelay').value;
    if(delay < 2 || delay > 60 )
    {
        delay = 2;
    }

    delay = delay * 1000;

    chrome.tabs.update(tab.id, {url: uri}, function(updatedTab)
    {
        console.log('\tloaded taburl/status/id: ', updatedTab.url, updatedTab.status, updatedTab.id);
        console.log('\tloaded tab expected: ', uri);
        console.log('\tsleep: ', delay);
        
        //update tab state just in case state changed after updating, e.g., google capture, so wait a little - start
        setTimeout(function()
        {
            chrome.tabs.get(updatedTab.id, function(tab)
            {
                //early update of tab state before chrome.tabs.onUpdated() called
                globalCurTabIDsDict[tab.id] = tab;

                console.log('\tupdate loaded tab current uri/status/id: ', tab.url, tab.status, tab.id);
                processHTMLForTab(tab, uri, page);
            });
        }, delay);
        //update tab state just in case state changed after updating, e.g., google capture, so wait a little - end
        
    });
}

function isTabReady(tab, expectedTabURI)
{
    console.log('isTabReady():');
    console.log('\tglobalCurTabIDsDict: ', globalCurTabIDsDict);

    //ensure tab is completely loaded before running script - start
    //note that tab information is not fresh, so any result update is not seen by tab, but globalCurTabIDsDict is fresh
    
    if( globalCurTabIDsDict[tab.id] )
    {
        if( globalCurTabIDsDict[tab.id].status != "complete" )
        {
            console.log('\ttab NOT loaded');
            return false;
        }
    }
    else
    {
        console.log('\ttab NOT in dict: ', tab.id);
        return false;
    }
    //ensure tab is completely loaded before running script - end

    if( expectedTabURI !== undefined )
    {
        //check if tab is expected tab - start
        console.log('\tcurrent tab.url/id: ', globalCurTabIDsDict[tab.id].url, tab.id);
        console.log('\texpected tab.url: ', expectedTabURI);

        var googleSignature = 'https://www.google.';
        if( expectedTabURI.indexOf(googleSignature) == 0 )
        {
            //special code for google domain - start
            //this is a sample captcha uri: https://ipv4.google.com/sorry/IndexRedirect?continue=https://www.google.com/search%3Fq%3Dny%2Bweather%26bav%3Don.2,or.%26cad%3Db%26biw%3D1000%26bih%3D600%26dpr%3D1%26ech%3D1%26psi%3DrZvAV-6ME-Xw6AShobqYAw.1472240560900.3%26ei%3DrZvAV-6ME-Xw6AShobqYAw%26emsg%3DNCSR%26noj%3D1&q=CGMSBKL3SNgYtLeCvgUiGQDxp4NLe393I0v93BAmCHYWTzkrq2qqML8
            if( globalCurTabIDsDict[tab.id].url.indexOf(googleSignature) != 0 )
            {
                console.log('\twww.google.com not prefix; captcha possible');
                return false;
            }
            //special code for google domain - end
        }
        else
        {
            if( expectedTabURI.indexOf(globalCurTabIDsDict[tab.id].url) == -1 )
            {
                console.log('\ttab MISMATCH');
                return false;
            }
        }
        //check if tab is expected tab - end
    }
    
    console.log('\ttab ready');
    return true;
}

//responsible for populating globalPayload
function processHTMLForTab(tab, expectedTabURI, page)
{
    console.log('');
    console.log('processHTMLForTab():');
    console.log('\tglobalTabReadyCount: ', globalTabReadyCount);

    if( globalTabReadyCount > 100 )
    {
        globalTabReadyCount = globalMaxTabReadyCount + 1;
    }

    //fix stale page problem that confuses captcha - start
    if( globalTabReadyCount === globalMaxTabReadyCount-2 )
    {
        console.log('\tREFRESHING POSSIBLE STALE TAB');
        chrome.tabs.reload(tab.id);
    }
    //fix stale page problem that confuses captcha - end

    if( globalTabReadyCount > globalMaxTabReadyCount )
    {
        closeAlert();
        createAlertMessageBoard('alert', 'Attention required: Please check the search tab. Solve captcha or refresh page.');
    }
    
    if( isTabReady(tab, expectedTabURI) == false )
    {
        globalTabReadyCount++;
        setTimeout(function()
        {
            processHTMLForTab(tab, expectedTabURI, page);
        }, 1000);
        
        return;
    }
    

    //update tab
    globalTabReadyCount = 0;
    tab = globalCurTabIDsDict[tab.id];

    chrome.tabs.executeScript(tab.id,
    {
        file: "./scripts/getGoogleLinksDict.js"
        /*code: codeToExecute*/
    }, function(result)
    {
        console.log('\tprocessHTMLForTab(), executeScript():');
        console.log('\tdone tab:', tab.url);
        console.log('\tdone page:', page);
        console.log('\tresult:', result);
        var resultLength = 0;

        //injecting into an extensions page or the webstore/NTP = error
        if (chrome.runtime.lastError)
        {
            console.log('\t', chrome.runtime.lastError.message);
        }

        /*
            result format:
            [0](artifact of runtime){
                'link': {'title': '', 'crawlDatetime': '', 'snippet': ''...}
                ...
            }
        */
        if (result.length !== 0)
        {
            //serp order - start
            //add page number - start
            for (var link in result[0]) 
            {
                result[0][link].page = page;
                resultLength++;
            }
            //add page number - end


            //Object.keys(result[0])
            //directive?: check for duplicate page based on previous entry before adding
            if (page == 1)
            {
                globalPayload[0] = getListOfDict(result[0]);
            }
            else
            {
                //merge with previous
                globalPayload[0] = globalPayload[0].concat(getListOfDict(result[0]));
            }
            //serp order - end
        }

        //prompt and prepare query - start
        closeAlert();
        var alertMsg = (globalNewsCollectionIndexer + 1) + '/' + globalNewsCollection.collection.length + ': Searching (Page: ' + page + '/' + globalMaxPagesToVisit + '). Please don\'t close search tab.';
        var query = globalNewsCollection.query;
        if( !globalAppState.nonLocalFlag )
        {
            var domain = getDomain(globalNewsCollection.collection[globalNewsCollectionIndexer].source.website);

            query += ' site:' + domain;
            alertMsg = alertMsg.replace('Searching', ' Searching: ' + domain);
        }
        createAlertMessageBoard('alert warning', alertMsg, true);
        //prompt and prepare query - end

        if( page == globalMaxPagesToVisit || resultLength == 0 )
        {
            //for this source all pages have been visited
            if (globalPayload.length != 0)
            {
                //serp order - start
                SERPUpdateRanks(globalPayload[0]);
                //serp order - end
                globalNewsCollection.collection[globalNewsCollectionIndexer].links = globalPayload[0];
            }

            setTimeout(function()
            {
                serveGlobalNewsPayload(tab);
            }, 1000);
        }
        else
        {
            //for this source all pages have NOT been visited
            openURITab(tab, query, page + 1);
        }

    });
}

function serveGlobalNewsPayload(tab)
{
    console.log('');
    console.log('serveGlobalNewsPayload():');
    //here means 1 source already done
    console.log('\tgloIndexer: ', globalNewsCollectionIndexer, 'of', globalNewsCollection.collection.length);
    globalNewsCollectionIndexer++;

    
    if( globalStopFlag || globalNewsCollectionIndexer >= globalNewsCollection.collection.length )
    {
        //stop search - start
        //reset
        globalNewsCollectionIndexer = 0;
        globalPayload = [];
        closeAlert();
        document.getElementById('submitButton').disabled = false;//debug avoid null, also in similar areas

        if( globalStopFlag )
        {
            //search was terminated by user
            console.log('\tsearch aborted by user');
            globalStopFlag = false;
        }
        
        
        console.log('\t', globalNewsCollection);
        console.log('\tpregrid:', globalNewsCollectionCount);globalEditingFlag


        //drawGrid(localNewsCollections, columnCount, uniqueUserID, embedCardClassName, twitterButton, excludeLink, generateCards, updateTableTitleLinks)
        drawGrid
        (
            localNewsCollections=globalNewsCollection, 
            columnCount=5, 
            uniqueUserID=globalUniqueUserID, 
            embedCardClassName=globalEmbedCardClassName,
            globalGridfunctionPackage
        );

        /*
        drawGrid(
            localNewsCollections=globalNewsCollection, 
            columnCount=5, 
            uniqueUserID=globalUniqueUserID, 
            embedCardClassName=globalEmbedCardClassName,
            twitterButton=twitterButton,
            excludeLink=excludeLink,
            generateCards=generateCards,
            updateTableTitleLinks=updateTableTitleLinks
            );
        */

        console.log('\tpostgrid:', globalNewsCollectionCount);

        setTimeout(function()
        {
            chrome.tabs.remove(tab.id, null);
        }, 5000);
        
        //stop search - end
    }
    else
    {
        //closeAlert();
        
        if( globalAppState.nonLocalFlag )
        {
           /* createAlertMessageBoard('alert warning', '...searching ' + 
                (globalNewsCollectionIndexer + 1) + 
                ' of ' + globalNewsCollection.collection.length + 
                ', please don\'t close search tab.', true
            );*/
            openURITab(tab, globalNewsCollection.query, 1);
        }
        else
        {
            var domain = globalNewsCollection.collection[globalNewsCollectionIndexer].source.website;
            domain = getDomain(domain);

            /*
            createAlertMessageBoard('alert warning', '...searching ' + 
                (globalNewsCollectionIndexer + 1) + 
                ' of ' + globalNewsCollection.collection.length + 
                ', please don\'t close search tab. Searching ' + domain, true
            );*/
            
            openURITab(tab, globalNewsCollection.query + ' site:' + domain, 1);
        }

    }
}
//google backbone - end

//user custom collection interaction - start
function userAddCollectionInputClick()
{
    console.log('');
    console.log('userAddCollectionInputClick():');

    var typesDescription = [
        ['url', 'URL'],
        ['text', 'Title'],
        ['text', 'Snippet'],
        ['date', 'Date']
    ];

    var newCollectionMenu = document.getElementById('newCollectionMenu');
    var divClassName = 'pure-u-1 pure-u-md-1-4';
    var inputName = 'pure-u-23-24';

    for (var i = 0; i < typesDescription.length; i++)
    {
        var type = typesDescription[i][0];
        var description = typesDescription[i][1];

        var urlDiv = document.createElement('div');
        urlDiv.className = divClassName;

        var urlLabel = document.createElement('label');
        urlLabel.innerHTML = description;

        var newColUrl = document.createElement('input');
        newColUrl.id = 'newCol' + description;
        newColUrl.className = inputName + ' newCol' + description;
        newColUrl.type = type;
        if (description == 'URL')
        {
            newColUrl.value = 'http://';
        }
        newColUrl.required = true;

        urlDiv.appendChild(urlLabel);
        urlDiv.appendChild(newColUrl);
        newCollectionMenu.appendChild(urlDiv);
    }
}

function userAddCollectionClick()
{
    console.log('');
    console.log('userAddCollectionClick():');
    var urls = document.getElementsByClassName('newColURL');
    var titles = document.getElementsByClassName('newColTitle');
    var snippets = document.getElementsByClassName('newColSnippet');
    var dates = document.getElementsByClassName('newColDate');

    var links = [];
    for (var i = 0; i < urls.length; i++)
    {
        var link = urls[i].value;
        var title = titles[i].value;
        var crawlDatetime = dates[i].value;
        var snippet = snippets[i].value;

        if (isValidUrl(link) === false)
        {
            continue;
        }

        if (isNaN(Date.parse(crawlDatetime)))
        {
            crawlDatetime = '';
        }

        var tempObj = {
            link: link,
            title: removeHTMLFromStr(title),
            snippet: removeHTMLFromStr(snippet),
            'crawl-datetime': crawlDatetime,
            rank: 0,
            page: 0,
            custom: {}
        };

        links.push(tempObj);
    }

    if( !globalNewsCollection.collection )
    {
        createAlertMessageBoard('alert', 'Cannot add to empty collection');
        return;
    }

    if (globalNewsCollection.collection.length != 0 && links.length != 0)
    {
        //standard schema - 0
        var tempObjSource = {
            facebook: '',
            twitter: '',
            video: '',
            'city-county-name': '',
            'city-county-lat': 0,
            'city-county-long': 0,
            country: '',
            miles: '',
            name: 'User Contribution',
            state: '',
            'media-class': '',
            'media-subclass': '',
            website: ''
        };

        //standard schema - 7
        if (globalNewsCollection.collection[0].source['media-class'].length == 0)
        {
            globalNewsCollection.collection[0] = {
                links: globalNewsCollection.collection[0].links.concat(links),
                source: tempObjSource
            };
        }
        else
        {
            //first time user is contributing
            globalNewsCollection.collection.unshift(
            {
                links: links,
                source: tempObjSource
            });
        }

        document.getElementById('showCardsChkbox').checked = false;
        globalEditingFlag = true;
        createAlertMessageBoard('alert info', 'Cards switched off during edit. Goto ᐁ and check "Show cards" when done editing.');

        drawGrid
        (
            localNewsCollections=globalNewsCollection, 
            columnCount=5, 
            uniqueUserID=globalUniqueUserID, 
            embedCardClassName=globalEmbedCardClassName,
            globalGridfunctionPackage
        );
    }
}

function downloadColfileClick()
{
    console.log('');
    console.log('downloadColfileClick():');

    if (!globalNewsCollection.collection)
    {
        return;
    }

    //check if user has excluded some links
    editGlobalNewsCollection();
    if( !globalEditedCollection.collection )
    {
        return;
    }

    var typeDict = {json: 'application/json', txt: 'text/plain'};
    var downloadType = document.getElementById('downloadType').value;

    console.log('\ttype: ', downloadType);
    console.log('\tdownloadType: ', typeDict[downloadType]);

    var blob;
    if( downloadType == 'json' )
    {
        blob = new Blob([JSON.stringify(globalEditedCollection, null, 2)],
        {
            type: typeDict[downloadType]
        });
    }
    else if( downloadType == 'txt' )
    {
        var plaintext = '';
        for(var i=0; i<globalEditedCollection.collection.length; i++)
        {
            var sourceLinksDict = globalEditedCollection.collection[i];
            for(var j=0; j<sourceLinksDict.links.length; j++)
            {
                plaintext = sourceLinksDict.links[j].link + '\n' + plaintext;
            }
        }

        blob = new Blob([plaintext],
        {
            type: typeDict[downloadType]
        });
    }
    else
    {
        return;
    }

    var url = window.URL.createObjectURL(blob);
    var outfilename = document.getElementById('newColDownloadFilename').value.trim();
    if (outfilename.length == 0)
    {
        //outfilename = globalNewsCollection.query;
        outfilename = getSavedQueryID();
        document.getElementById('newColDownloadFilename').value = outfilename;
    }

    outfilename = outfilename + '-LMP.' + downloadType;

    var aTag = document.createElement('a');
    aTag.download = removeHTMLFromStr(outfilename);
    aTag.href = url;
    aTag.style.display = 'none';
    aTag.click();

    document.getElementById('advBtn').click();
}

function uploadNewColfile(evt)
{
    //credit to: http://www.html5rocks.com/en/tutorials/file/dndfiles/

    var files = evt.target.files;

    if( files.length == 0 )
    {
        return;
    }

    f = files[0];
    var reader = new FileReader();

    // Closure to capture the file information.
    reader.onload = (function(theFile)
    {
        return function(data)
        {
            //document.getElementById("advBtn").click();
            globalNewsCollection = JSON.parse(data.target.result);
            globalEditingFlag = false;
            document.getElementById("advBtn").click();
        
            drawGrid
            (
                localNewsCollections=globalNewsCollection, 
                columnCount=5, 
                uniqueUserID=globalUniqueUserID, 
                embedCardClassName=globalEmbedCardClassName,
                globalGridfunctionPackage
            );
        };
    })(f);

    reader.readAsText(f);
}

//user custom collection interaction - start


//self-contained functions - start
function isValidUrl(url)
{
    var a = document.createElement('a');
    a.href = url;

    if (a.hostname.length == 0)
    {
        return false;
    }

    return (a.hostname != window.location.host);
}

function getDomain(uri)
{
    var aTag = document.createElement('a');
    aTag.href = uri;
    return aTag.hostname.replace('www.', '');
}

function removeHTMLFromStr(htmlStr)
{
    var tmpDiv = document.createElement('div');
    tmpDiv.innerHTML = htmlStr;
    return tmpDiv.textContent || tmpDiv.innerText || '';
}

//responsible for retrieving data to server
function httpGet(uri, callback, errorCallback)
{
    var x = new XMLHttpRequest();
    x.open('GET', uri);

    x.responseType = 'json'; //text or json
    x.onload = function()
    {
        var response = x.response;
        if (!response)
        {
            errorCallback('No response.');
            return;
        }
        //console.log(response.message);
        callback(response);
    };
    x.onerror = function()
    {
        errorCallback('Network error.');
    };
    x.send();
}

function httpPost(jsonData, postURI, callback)
{
    var xhr = new XMLHttpRequest();
    xhr.open('POST', postURI);
    xhr.setRequestHeader('Content-Type', 'application/json');

    xhr.onreadystatechange = function () 
    {
        if (xhr.readyState == 4 && xhr.status == 200) 
        {
            callback(xhr.responseText);
        }
    }

    xhr.onerror = function()
    {
        console.log('httpPost(): Network error.');
        callback({});
    };

    xhr.send( JSON.stringify(jsonData) );
}
//self-contained functions - end

function getDateRange()
{
    //sample uri with date range: https://www.google.com/#q=daterange+google&tbs=cdr:1,cd_min:8/2/2016,cd_max:8/3/2016
    //&tbs=cdr:1,cd_min:8/2/2016,cd_max:8/3/2016
    var datesDict = {minDateRange: '', maxDateRange: ''};
    var dateRangeFlag = false;
    var dateRange = '';

    for(var dateRange in datesDict)
    {
        var dateRangeKey = dateRange;
        //YYYY-MM-DD
        var dateRange = document.getElementById(dateRangeKey).value;
        if( dateRange.length )
        {
            dateRange = dateRange.split('-');
            if( dateRange.length == 3 )
            {
                //Mm to m if M is 0
                if( dateRange[1][0] == '0' )
                {
                    dateRange[1] = dateRange[1][1];
                }

                //Mm to m if M is 0
                if( dateRange[2][0] == '0' )
                {
                    dateRange[2] = dateRange[2][1];
                }

                dateRangeFlag = true;
                datesDict[dateRangeKey] = dateRange[1] + '/' + dateRange[2] + '/' + dateRange[0];
            }
        }
    }

    if( dateRangeFlag )
    {
        dateRange = '&tbs=cdr:1,cd_min:' + datesDict.minDateRange + ',cd_max:' + datesDict.maxDateRange;
    }

    return dateRange;
}

function googleGetSearchURI(searchString, page)
{
    //console.log('');
    
    console.log('\ngoogleGetSearchURI(): page: ', page);

    searchString = searchString.trim();
    if (searchString.length == 0 || page < 1)
    {
        return '';
    }

    //searchString modify - start
    /*
        searchString = searchString.split(' ');
        var seachQuery = '';
        for (var i = 0; i < searchString.length; i++)
        {
            seachQuery = seachQuery + searchString[i] + '+';
        }
        seachQuery = seachQuery.substr(0, seachQuery.length - 1);
    */
    //searchString modify - end
    var qOrAsQ = 'as_q';//qOrAsQ = 'q'; qOrAsQ = 'as_q';
    var seachQuery = qOrAsQ + '=' + encodeURIComponent(searchString);//for https://www.google.com/search/?as_q=alexander+desplat
    //seachQuery = 'q=' + seachQuery;//for https://www.google.com/#q=alexander+desplat//redirects sometime to /search?q=...&cad=h, leading to erratic behavior on some machines (windows)

    if (page > 1)
    {
        seachQuery = seachQuery + '&start=' + ((page - 1) * 10);
    }

    //google news flag - start
    var googleNewsFlag = '';
    if ( document.getElementById('googleNewsChkbox').checked )
    {
        googleNewsFlag = '&tbm=nws';
    }
    //google news flag - end

    //seachQuery = 'https://www.google.com/#' + seachQuery + googleNewsFlag + getDateRange();//https://www.google.com/#q=alexander+desplat
    seachQuery = 'https://www.google.com/search?' + seachQuery + googleNewsFlag + getDateRange();

    //standard schema - 8
    var tempObj = {'search-uri': seachQuery, deleted: false};

    //standard schema - 9
    if( globalNewsCollection['self-collection'] )
    {
        globalNewsCollection['self-collection'].push(tempObj);
    }
    else
    {
        globalNewsCollection['self-collection'] = [tempObj];
    }

    return seachQuery;
}

//serp order - start
function SERPLinkComparator(linkA, linkB) 
{
    return linkA.rank - linkB.rank;
}

function SERPUpdateRanks(serpList)
{
    var rank = 1;
    for(var i = 0; i<serpList.length; i++)
    {
        serpList[i].rank = rank;
        rank++;
    }
}
//serp order - end

function getListOfDict(linksDict)
{
    console.log('');
    console.log('getListOfDict():');

    var listOfLinksDicts = [];

    for (var link in linksDict)
    {
        //note: crawlDatetime could be blank or in form Jun 4, 2016 or datetime from now
        //sometimes date is not properly initialized
        //standard schema - 10
        if( isNaN(Date.parse(linksDict[link]['crawl-datetime'])) )
        {
            //standard schema - 11
            linksDict[link]['crawl-datetime'] = '';   
        }
        else
        {
            //standard schema - 12
            linksDict[link]['crawl-datetime'] = linksDict[link]['crawl-datetime'];
        }

        linksDict[link].link = link;
        linksDict[link].title = removeHTMLFromStr(linksDict[link].title);
        linksDict[link].snippet = removeHTMLFromStr(linksDict[link].snippet);

        listOfLinksDicts.push(linksDict[link]);
    }

    listOfLinksDicts.sort(SERPLinkComparator);
    return listOfLinksDicts;
}

function updateTableTitleLinks()
{
    console.log('');
    console.log('updateTableTitleLinks():');

    var caption = document.getElementById('tableCaption');
    if( caption === null )
    {
        return;
    }
    
    //standard schema - 13
    if( globalNewsCollection['archive-is'] )
    {
        var tableCaption = document.getElementById('tableCaption');
        var indexOf = tableCaption.innerHTML.indexOf(' Archive: ');
        console.log('\tindexOf: ', indexOf);

        if( indexOf == -1 )
        {
            indexOf = tableCaption.innerHTML.length;
        }

        //standard schema - 14
        tableCaption.innerHTML = 
        tableCaption.innerHTML.substr(0, indexOf) + 
        ' Archive: <a href="' + globalNewsCollection['archive-is'] + '" target="_blank">' + globalNewsCollection['archive-is'] + '</a>';
    }
    else
    {
        var archiveLink = archiveISGetCollectionArchivedURL();
        archiveLink = archiveLink + '?referrer=archive.archive.is';

        document.getElementById('tableCaption').innerHTML += ' Archive: <a href="' + archiveLink + '" target="_blank"> search </a>';
    }

    
}

//vis - start

function excludeLink(div)
{

    console.log('excludeLink():');
    if( !globalNewsCollection.collection )
    {
        return;
    }

    var sourceIndex = div.getAttribute('sourceIndex');
    if( sourceIndex !== null )
    {
        console.log('\tsource index to exclude');
        //exclude entire source (collection of links)
        if( sourceIndex < globalNewsCollection.collection.length )
        {
            console.log('\t\tsourceIndex:', sourceIndex);
            console.log('\t\tselected col:', globalNewsCollection.collection[sourceIndex].source);
            if( globalNewsCollection.collection[sourceIndex].source.exclude === true )
            {
                //undo exclude
                globalNewsCollection.collection[sourceIndex].source.exclude = false;
                //standard schema - 21
                globalNewsCollection['self-collection'][sourceIndex].deleted = false;
            }
            else
            {
                //exclude
                globalNewsCollection.collection[sourceIndex].source.exclude = true;
                //standard schema - 22
                globalNewsCollection['self-collection'][sourceIndex].deleted = true;
            }
        }
        else
        {
            console.log('\t\tsourceIndex out of range:', sourceIndex);
        }
    }
    else
    {
        console.log('\tsingle index to exclude');
        //exclude single link
        var row = div.getAttribute('locX');
        var col = div.getAttribute('locY');

        if (row < globalNewsCollection.collection.length)
        {
            if (col < globalNewsCollection.collection[row].links.length)
            {
                console.log('\tselected col:', globalNewsCollection.collection[row].links[col]);

                if( globalNewsCollection.collection[row].links[col].exclude === true )
                {
                    globalNewsCollection.collection[row].links[col].exclude = false;
                }
                else
                {
                    globalNewsCollection.collection[row].links[col].exclude = true;
                }
            }
            else
            {
                console.log('\t\tcol out of range:', col);
            }
        }
        else
        {
            console.log('\t\trow out of range:', row);
        }
    }
}

function editGlobalNewsCollection()
{

    console.log('');
    console.log('editGlobalNewsCollection():');

    if( !globalNewsCollection.collection )
    {
        return {};
    }
    globalEditedCollectionCount = 0;

    globalEditedCollection = {};
    var keys = Object.keys(globalNewsCollection);

    for(var i=0; i<keys.length; i++)
    {
        if( keys[i] != 'collection' )
        {
            globalEditedCollection[keys[i]] = globalNewsCollection[keys[i]];
        }
    }

    
    var collection = [];
    for(var i=0; i<globalNewsCollection.collection.length; i++)
    {
        if( globalNewsCollection.collection[i].source.exclude !== true )
        {
            var tempSourcLinkDict = {source: globalNewsCollection.collection[i].source, links: []};
            for(var j=0; j<globalNewsCollection.collection[i].links.length; j++)
            {
                if( globalNewsCollection.collection[i].links[j].exclude === true )
                {
                    console.log('\tremoving: ', globalNewsCollection.collection[i].links[j].title);
                }
                else
                {
                    globalEditedCollectionCount++;
                    tempSourcLinkDict.links.push(globalNewsCollection.collection[i].links[j]);
                }
            }
            collection.push(tempSourcLinkDict);
        }
    }
    globalEditedCollection.collection = collection;
    //console.log('\tglobalEditedCollection: ', globalEditedCollection);

}

function toggleCards()
{
    console.log('');
    console.log('toggleCards():');

    if( !globalNewsCollection.collection )
    {
        return;
    }
    
    if( document.getElementById('showCardsChkbox').checked )
    {
        //assumption is that editing is done
        globalEditingFlag = false;
        if( globalGridfunctionPackage.generateCards )
        {
            createAlertMessageBoard('alert info', '...generating cards');
        }
    }

    drawGrid
    (
        localNewsCollections=globalNewsCollection, 
        columnCount=5, 
        uniqueUserID=globalUniqueUserID, 
        embedCardClassName=globalEmbedCardClassName,
        globalGridfunctionPackage
    );
}

function generateCards()
{
    //reset
    globalEditingFlag = false;

    //console.log('generateCards() SWITCHED OFF');
    //return;

    console.log('');
    console.log('generateCards():');
    if ( document.getElementById('showCardsChkbox').checked == false )
    {
        console.log('\tCards off');
        return;
    }
    
    var cards = document.getElementsByClassName(globalEmbedCardClassName);
    console.log('\tcards count: ' + cards.length);

    if (cards.length != globalNewsCollectionCount)
    {
        if (globalDebugFlag)
        {
            console.log('\tTable hasn\'t finished loading, will return in 3 seconds');
        }
        setTimeout(function()
        {
            generateCards();
        }, 3000);
    }
    else
    {
        if (globalDebugFlag)
        {
            console.log('\tTable finished loading, will not return');
        }

        //set embedly defaults - start
        embedly("defaults",
        {
            cards:
            {
                width: '80%'/*,
                'align': 'left'*/
            }
        });
        //set embedly defaults - end

        
        //reset
        globalNewsCollectionCount = -1;
        closeAlert();

        setTimeout(function()
        {
            for (var i = 0; i < cards.length; i++)
            {
                embedly('card', cards[i]);
            }
        }, 500);
    }
}

function closeAlert()
{
    var alertCloseButton = document.getElementById('alertCloseButton');
    if( alertCloseButton )
    {
        alertCloseButton.click();
    }
}

function createAlertMessageBoard(className, msg, stopFlag)
{
    if (className === undefined)
    {
        className = 'alert warning';
    }

    if (msg === undefined)
    {
        msg = 'Alert!';
    }

    if( stopFlag == undefined )
    {
        stopFlag = false;
    }
    else
    {
        stopFlag = true;
    }

    console.log('');
    console.log('createAlertMessageBoard():');
    var msgParentDiv = document.getElementById('alertMessage');
    var prevMsg = document.getElementById('alertMessageMain');

    if(prevMsg)
    {
        //don't repeat same msg
        if (prevMsg.innerHTML === msg)
        {
            return;
        }
    }

    /*
        //credit to: http://www.w3schools.com/howto/tryit.asp?filename=tryhow_js_alerts
        div format:
        <div class="alert"> class set: alert, alert success, alert info (blue), alert warning (orange)
            <span class="alertClosebtn">&times;</span>
            <strong>Danger!</strong> Indicates a dangerous or potentially negative action.
        </div>
    */

    var msgDiv = document.createElement('div');
    msgDiv.className = className;

    var closeSpan = document.createElement('span');
    closeSpan.className = 'alertClosebtn';
    closeSpan.id = 'alertCloseButton';
    closeSpan.innerHTML = '&times;';
    closeSpan.onclick = function()
    {
        var alertStopButton = document.getElementById('alertStopButton');
        if( alertStopButton )
        {
            alertStopButton.innerHTML = 'STOP';
        }
        document.getElementById('alertMessage').innerHTML = '';
    };

    var stopSpan = document.createElement('span');
    stopSpan.className = 'alertStopbtn';
    stopSpan.id = 'alertStopButton';
    stopSpan.innerHTML = 'STOP';
    stopSpan.onclick = function()
    {
        this.innerHTML = 'STOPPING';
        globalStopFlag = true;
    };


    var strongTag = document.createElement('strong');
    strongTag.id = 'alertMessageMain';
    //strongTag.appendChild(document.createTextNode(msg));
    strongTag.innerHTML = msg;

    msgDiv.appendChild(closeSpan);
    if( stopFlag )
    {
        msgDiv.appendChild(stopSpan);
    }
    msgDiv.appendChild(strongTag);
    msgParentDiv.appendChild(msgDiv);
}
//vis - end

function saveRemoteGenericResponseHandler(saveResponse)
{
    console.log('');
    console.log('saveRemoteGenericResponseHandler(), saveResponse: ', saveResponse);

    if( saveResponse == 'Saved' )
    {
        //new schema
        createAlertMessageBoard('alert success', 'Saved: <a href="' + getRemoteSavedURI() + '" target="_blank">My collection</a>');
    }
    else if( saveResponse == 'No space' )
    {   
        createAlertMessageBoard('alert', 'Sorry, your collection could not be saved because we\'ve run out of storage space. Try saving your collection locally.');
    }
    else
    {
        createAlertMessageBoard('alert', 'Sorry, your collection could not be saved. This may be because you have an outdated software version. Please install the latest version.');
    }
}

function getRemoteSavedURI()
{
    console.log('');
    console.log('getRemoteSavedURI():');
    
    //new schema format: http://www.localmemory.org/vis/collections/VXiBJ8mWfrl8gb8anL7c/queries/usa-33109-zika-virus-15?off=cards,alert
    return 'http://www.localmemory.org/vis/collections/' + globalUniqueUserID + '/' + 'queries' + '/' + getSavedQueryID();
}

//responsible for determining uri scheme
function getSavedQueryID()
{
    if(!globalNewsCollection.query)
    {
        return '';
    }

    var datestamp = new Date(globalNewsCollection.timestamp);

    var year = datestamp.getFullYear() + '';
    var month = (datestamp.getMonth() + 1) + '';
    var day = datestamp.getDate() + '';
    var nvFlag = '';
    var formattedQuery = globalNewsCollection.query;
    var zipcodeOrCity;

    if( month.length == 1 )
    {
        month = '0' + month;
    }
    if( day.length == 1 )
    {
        day = '0' + day;
    }
    datestamp = year + '-' + month + '-' + day;

    if ( document.getElementById('googleNewsChkbox').checked )//debug?
    {
        nvFlag = '-nv';
    }
    nvFlag = '';//deactivated

    if( globalAppState.nonLocalSiteParam )
    {
        //remove site param from query for uri
        formattedQuery = formattedQuery.replace(globalAppState.nonLocalSiteParam, '');
    }
    
    if( globalNewsCollection.country === 'USA' )
    {
        zipcodeOrCity = globalNewsCollection.zipcode;
    }
    else
    {
        zipcodeOrCity = globalNewsCollection.city;
    }

    return getRequestID(
                            globalNewsCollection.country, 
                            zipcodeOrCity, 
                            formattedQuery,
                            //standard schema - 23
                            globalNewsCollection['maximum-links-per-source']
                        ) + '-' + datestamp + nvFlag;
}

function saveRemotely(callback)
{
    console.log('');
    console.log('saveRemotely():');
    
    //check if user has excluded some links
    editGlobalNewsCollection();
    if( !globalEditedCollection.collection )
    {
        return;
    }
    
    //standard schema - 24 - start
    globalEditedCollection['user-id'] = globalUniqueUserID;//identify user
    globalEditedCollection['query-id'] = getSavedQueryID();//identify query of user
    globalEditedCollection['user-id-query-id'] = globalEditedCollection['user-id'] + '_' + globalEditedCollection['query-id'];//identify single request of user
    globalEditedCollection['pvt-id'] = globalPvtID;


    console.log('\tuserIDQueryID: ', globalEditedCollection['user-id-query-id']);
    //standard schema - 24 - end

    //implement some security
    httpPost(globalEditedCollection, globalBaseURI + 'saveVis/', function(response)
    {
        //DON'T EXPOSING pvtID - start
        //standard schema - 25
        delete globalEditedCollection['pvt-id'];
        //DON'T EXPOSING pvtID - end

        response = JSON.parse(response);
        console.log('\tresponse: ', response);
        
        if( callback )
        {
            if( response.msg == 'Saved' )
            {
                globalAppState.savedRemotelyFlag = true;
            }

            callback(response.msg);
        }
    });
}

function archiveISGetCollectionArchivedURL()
{
    if(!globalNewsCollection.query)
    {
        return '';
    }

    //new schema
    return 'https://archive.is/' + getRemoteSavedURI();
}

function archiveIS(saveResponse)
{
    console.log('');
    console.log('archiveIS():');

    if(saveResponse == 'Saved')
    {
        document.getElementById('archiveButton').disabled = true;
        createAlertMessageBoard('alert warning', '...archiving, please do not close archive tab', true);

        //standard schema - 26
        if( globalNewsCollection['archive-is'] )
        {
            //standard schema - 27
            delete globalNewsCollection['archive-is'];
        }

        archiveISSendParentChildrenLinks('', -1, -1, -1);
    }
}

function archiveISSendParentChildrenLinks(archivedPageTab, row, col, progressCount)
{
    console.log('');
    console.log('archiveISSendChildrenLinks():');
    console.log('\trow: ', row);
    console.log('\tcol: ', col);

   
    if( row == -1 && col == -1 )
    {
        console.log('\tparent case');
        var cardsFlag = '';
        //special code to avoid archive.is timeout for storify - start
        if( globalAppState.nonLocalSiteParam === 'site:storify.com' )
        {
            cardsFlag = '&cards=off';
        }
        //special code to avoid archive.is timeout for storify - end
        
        //new schema
        var parentURI = 'https://archive.is/?url=' + 
        encodeURIComponent(
                                getRemoteSavedURI() + '?referrer=archive.archive.is' + cardsFlag
                          );
        console.log('\tparentURI: ', parentURI);

        archiveISCreateTabForURI(parentURI, 0, 0, 0);
    }
    else
    {
        console.log('\tchildren case');
        console.log('\tarchivedPageTab: ', archivedPageTab.url);
        
        var nextURI = '';
        var foundNextFlag = false;
        for(var i=row; i<globalEditedCollection.collection.length; i++)
        {
            for(var j=col; j<globalEditedCollection.collection[i].links.length; j++)
            {
                nextURI = globalEditedCollection.collection[i].links[j].link;
                //next place to start
                //continue visiting row, but shift to next column
                row = i;
                col = j+1;
                foundNextFlag = true;
                break;
            }

            if( col == globalEditedCollection.collection[i].links.length )
            {
                //all colums for row have been visited, goto next row reset column
                row++;
                col = 0;
            }

            if( foundNextFlag )
            {
                break;
            }
        }


        //first value of archivedPageTab is parent page, subsequent values are other archived pages' short uri
        closeAlert();
        
        //standard schema - 28
        if( !globalNewsCollection['archive-is'] )
        {
            var shortLink = archivedPageTab.url;
            shortLink = shortLink.replace('https://archive.is/?url=', 'https://archive.is/');

            createAlertMessageBoard('alert warning', '...archiving, please don\'t close archive tab. Your archived collection: <a href="' + shortLink + '" target="_blank">' + shortLink + '</a>', true);
            //standard schema - 29
            globalNewsCollection['archive-is'] = shortLink;
        }
        else
        {
            //standard schema - 30
            //progress bar - start
            createAlertMessageBoard('alert warning', '...archiving ' + 
                progressCount  + ' of '+ globalEditedCollectionCount  + 
                ', please don\'t close archive tab. Your saved collection: <a href="' + 
                globalNewsCollection['archive-is'] + '" target="_blank">' + globalNewsCollection['archive-is'] + '</a>. Sending to archive: ' + nextURI, true
            );
            //progress bar - end
        }

        
        console.log('\tsendingForArchive: ', nextURI);
        if( nextURI == '' || globalStopFlag )
        {
            if( globalStopFlag )
            {
                globalStopFlag = false;
            }

            archiveISDone(archivedPageTab);
        }
        else
        {
            var childURI = 'https://archive.is/?url=' + nextURI;
            archiveISLoadURIInTab(archivedPageTab, childURI, row, col, progressCount+1);
        }

    }
}

function archiveISCreateTabForURI(uri, row, col, progressCount)
{
    console.log('');
    console.log('archiveISCreateTabForURI():');

    chrome.tabs.query({'active': true}, function(parentTabs)
    {
        if( parentTabs.length != 0 )
        {
            chrome.tabs.create(
            {
                'url': uri,
                'index': parentTabs[0].index + 1,
                'active': false
            },
            function(childTab)
            {
                console.log('\tsleep: 2s');
                chrome.tabs.get(childTab.id, function(tab)
                { 
                    console.log('\tcreated taburl/status/id: ', tab.url, tab.status, tab.id);
                    globalCurTabIDsDict[tab.id] = tab;
                    archiveISPreGetShortLink(tab, row, col, progressCount);
                });
            });
        }
    });
}

//vary wait time to allow click archive again
function archiveISLoadURIInTab(tab, uri, row, col, progressCount)
{
    //update tab
    console.log('');
    console.log('archiveISLoadURIInTab():');

    //setTimeout(function()
    //{
    chrome.tabs.update(tab.id, {url: uri}, function(updatedTab)
    {
        //early update of tab state before chrome.tabs.onUpdated() called
        globalCurTabIDsDict[tab.id] = updatedTab;

        console.log('\tloaded tab/status: ', updatedTab.url, updatedTab.status);
        console.log('\tloaded tab expected: ', uri);
        archiveISPreGetShortLink(updatedTab, row, col, progressCount);
    });
    //}, delay);
}

function archiveISPreGetShortLink(tab, row, col, progressCount)
{
    console.log('');
    console.log('archiveISPreGetShortLink():');
    console.log('\tglobalTabReadyCount: ', globalTabReadyCount);

    if( globalTabReadyCount > 100 )
    {
        globalTabReadyCount = globalMaxTabReadyCount + 1;
    }

    //fix stale page problem that confuses captcha - start
    if( globalTabReadyCount === globalMaxTabReadyCount-2 )
    {
        chrome.tabs.reload(tab.id);
    }
    //fix stale page problem that confuses captcha - end

    if( globalTabReadyCount > globalMaxTabReadyCount )
    {
        closeAlert();
        createAlertMessageBoard('alert', 'Attention required: Please refresh archive tab.');
    }

    //ensure tab is completely loaded before running script - start
    //isTabReady() does do a mismatch check since
    if( isTabReady(tab) == false )
    {
        globalTabReadyCount++;
        setTimeout(function()
        {
            archiveISPreGetShortLink(tab, row, col, progressCount);
        }, 1000);
        
        return;
    }
    
    //ensure tab is completely loaded before running script - end
    
    globalTabReadyCount = 0;
    tab = globalCurTabIDsDict[tab.id];
    
    chrome.tabs.executeScript(tab.id,
    {
        file: "./scripts/archiveIS.js"
    });

    var delay = document.getElementById('archivingDelay').value;
    if(delay < 2 || delay > 60 )
    {
        delay = 2;
    }

    console.log('\tdelay: ', delay);
    delay = delay * 1000;
    
    setTimeout(function()
    {
        //small delay for script to return, placing this in callback of .executeScript wasn't reliable
        archiveISGetShortLink(tab, row, col, progressCount);
    }, delay);
    
}

function archiveISGetShortLink(tab, row, col, progressCount)
{
    console.log('');
    console.log('archiveISGetShortLink():');
    console.log('\tglobalTabReadyCount: ', globalTabReadyCount);

    if( globalTabReadyCount > 100 )
    {
        globalTabReadyCount = globalMaxTabReadyCount + 1;
    }

    //fix stale page problem that confuses captcha - start
    if( globalTabReadyCount === globalMaxTabReadyCount-2 )
    {
        chrome.tabs.reload(tab.id);
    }
    //fix stale page problem that confuses captcha - end

    if( globalTabReadyCount > globalMaxTabReadyCount )
    {
        closeAlert();
        createAlertMessageBoard('alert', 'Attention required: Please refresh archive tab.');
    }

    //ensure tab is completely loaded before running script - start
    if( isTabReady(tab) == false )
    {
        globalTabReadyCount++;
        setTimeout(function()
        {
            archiveISGetShortLink(tab, row, col, progressCount);
        }, 1000);
        
        return;
    }
   
    //ensure tab is completely loaded before running script - end
    
    //update tab
    globalTabReadyCount = 0;
    tab = globalCurTabIDsDict[tab.id];
    if( row == 0 && col == 0 )
    {
        console.log('\tmaster page');
        //wait a little to attempt getting short link
        setTimeout(function()
        {
            chrome.tabs.get(tab.id, function(tab)
            {
                console.log('\tarchive.JS url: ', tab.url);
                //chrome.tabs.update(tab.id, {url: 'about:blank'});
                archiveISSendParentChildrenLinks(tab, row, col, progressCount);
            });

        }, 5000);
    }
    else
    {
        chrome.tabs.get(tab.id, function(tab)
        {
            console.log('\tarchive.JS url: ', tab.url);
            //chrome.tabs.update(tab.id, {url: 'about:blank'});
            archiveISSendParentChildrenLinks(tab, row, col, progressCount);
        });
    }
    
}

function archiveISDone(tab)
{
    console.log('');
    console.log('archiveISDone():');
    //check if tab is still in use, decide condition for: //chrome.tabs.remove(archivedPageTab.id, null);, when shor gotten set to blank
    console.log('\tarchivedParentURI: in globalNewsCollection');
    updateTableTitleLinks();

    setTimeout(function()
    {
        chrome.tabs.remove(tab.id, null);
        document.getElementById('archiveButton').disabled = false;
        closeAlert();
        //standard schema - 31
        createAlertMessageBoard('alert success', 'Done archiving. My archived collection: <a href="' + globalNewsCollection['archive-is'] + '" target="_blank">' + globalNewsCollection['archive-is'] + ' </a>');
    }, 5000);
}