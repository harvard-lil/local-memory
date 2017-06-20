// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
var globalClickCount = 0;
var applicationOnFlag = true;

//main
chrome.browserAction.onClicked.addListener(
    function(tab)
    {
        //detect double click - start
        //https://gist.github.com/karbassi/639453
        globalClickCount++;
        if (globalClickCount === 1)
        {
            singleClickTimer = setTimeout(
                function()
                {
                    globalClickCount = 0;
                    console.log('single click');
                    chrome.tabs.create(
                        {
                            /*'url': chrome.extension.getURL('index.html')*/
                            'url': 'index.html',
                            'index': tab.index + 1
                        },
                        function(tab) {

                        }
                    );

                }, 400);
        }
        else if (globalClickCount === 2)
        {
            clearTimeout(singleClickTimer);
            globalClickCount = 0;
            
            /*
            console.log('double click');
            if (applicationOnFlag == true)
            {
                chrome.browserAction.setBadgeText(
                {
                    text: 'OFF'
                });
                console.log('application switched off');
                applicationOnFlag = false;
            }
            else
            {
                chrome.browserAction.setBadgeText(
                {
                    text: ''
                });
                console.log('application switched on');
                applicationOnFlag = true;
            }
            */
        }
        //detect double click - end
    }
);


/*
//for testing background script
chrome.tabs.onUpdated.addListener(
    function(tabId, changeInfo, tab)
    {
        
        if (tab.status == "complete") 
        {
            //console.log('onUpdated():');
            if( tab.url.indexOf('https://www.google.com') == 0 )
            {
                chrome.tabs.executeScript(tab.id,
                {
                    file: "./scripts/getGoogleLinksDict.js"
                    //code: codeToExecute
                }, function(serp)
                {
                    console.log(serp[0]);
                });
            }
        }

    }
);
*/

/*
chrome.tabs.onActivated.addListener(
    function(tab)
    {
        console.log('onActivated():');
        console.log('\ttab: ', tab.url);
    }
);

chrome.tabs.onCreated.addListener(
    function(tab)
    {
        console.log('onCreated():');
    }
);

chrome.runtime.onStartup.addListener(
    function()
    {
        console.log('start');
    }
);

chrome.runtime.onInstalled.addListener(
    function()
    {
        console.log('Installed');
    }
);
*/