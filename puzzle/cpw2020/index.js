$(document).ready(function() {
    var invopen = false, ansopen = false, caninv = true, invanim = 300, invflash, ifunc, afunc;

    $('#invcont').click(ifunc = function(e) {
        if (!caninv) return;
        var skip = false;
        if (ansopen) afunc('hi'), skip=true;
        caninv = false;
        if (invflash) clearInterval(invflash), invflash = undefined, $(this).css('background-color','');
        invopen = !invopen;
        $('#invcont').animate({right:invopen?'95vw':0},invanim);
        $('#sandbox').animate({left:invopen?'5vw':'100vw'},invanim, function(){caninv=true});
        if (!(skip||e==='hi')) $('#cover').css('display','block').animate({opacity:invopen?0.5:0},invanim,function(){if(!invopen)$(this).css('display','none')});
    });

    $('#anscont').click(afunc = function(e) {
        if (!caninv) return;
        var skip = false;
        if (invopen) ifunc('hi'), skip=true;
        caninv = false;
        ansopen = !ansopen;
        $('#anscont').animate({right:ansopen?'20vw':0},invanim);
        $('#ansin').animate({left:ansopen?'80vw':'100vw'},invanim, function(){caninv=true});
        if (!(skip||e==='hi')) $('#cover').css('display','block').animate({opacity:ansopen?0.5:0},invanim,function(){if(!ansopen)$(this).css('display','none')});
        if (ansopen) $('#answer').focus();
    });

    var dismiss = function() {
        if (invopen) $('#invcont').click();
        else if (ansopen) $('#anscont').click();
    };

    $('#cover').click(dismiss);
    $(document.body).keydown(function(e) {
        if (e.key == 'Escape') dismiss();
    });

    var corrects = {
        'd641965aa1b6710bbaf920f89a523a821d8352b062d5f8c4530d562b834af84a': [
            [350, "eyJpdiI6ImQ3RmdCN0pkbG54WjExNjB5bkhDNUE9PSIsInYiOjEsIml0ZXIiOjEwMDAwLCJrcyI6MTI4LCJ0cyI6NjQsIm1vZGUiOiJjY20iLCJhZGF0YSI6IiIsImNpcGhlciI6ImFlcyIsInNhbHQiOiJ4eWV0MjBaTS9XMD0iLCJjdCI6IkhERSthRDRsVzZCMnhFQmpEVHpvMHZ3aDNvTFRQZWMrTlc5alJFcFNnblp4L1BHdUplUk1lUnUrc1g1ZGNkemlWMkJBeHI5TWZ0TVdhT0V1WnZuYThxWnVNK3hZd2ZZYk43ZFl1QnFkZXJvSFVSODFiWHdnRDlTVG01YjVXVlRHYVZhTlpHVmhnVnE0VFdsYjNwcz0ifQ=="],
            [350, "eyJpdiI6IlV2Y205NWV1UXI2UmxPZlp3UGd2YkE9PSIsInYiOjEsIml0ZXIiOjEwMDAwLCJrcyI6MTI4LCJ0cyI6NjQsIm1vZGUiOiJjY20iLCJhZGF0YSI6IiIsImNpcGhlciI6ImFlcyIsInNhbHQiOiJ4eWV0MjBaTS9XMD0iLCJjdCI6Ik15aS95b2p6UkI2anVkVW82aVJZcU9POFU3T2ZQRzlUNE5Zdmo0dHU4NGpNMUlSQkx2QXFCWGVOTkRLdXFOSldRcGhtcWtTL25RPT0ifQ=="],
            [-40, "eyJpdiI6ImxXSnllZWcvWnhscUFYRHcwTXFvYXc9PSIsInYiOjEsIml0ZXIiOjEwMDAwLCJrcyI6MTI4LCJ0cyI6NjQsIm1vZGUiOiJjY20iLCJhZGF0YSI6IiIsImNpcGhlciI6ImFlcyIsInNhbHQiOiJ4eWV0MjBaTS9XMD0iLCJjdCI6IllSNFNFVE9oK1dnTE9WRDlZZTA9In0="],
            [700, "eyJpdiI6IlJ2QmdBcmFac0xOODd4VVpvUExTa0E9PSIsInYiOjEsIml0ZXIiOjEwMDAwLCJrcyI6MTI4LCJ0cyI6NjQsIm1vZGUiOiJjY20iLCJhZGF0YSI6IiIsImNpcGhlciI6ImFlcyIsInNhbHQiOiJ4eWV0MjBaTS9XMD0iLCJjdCI6IkNBYlJ4Q2NWNVpaWEc2MzdpZnozVW1PYjJXTlF3OFJoOWdyYUpOOHR0bDA4czJzZW51N213UElMUzVIcy9Nb3o1QTlRZ0NETDVRbTJNRy9aZnE4ZmZYbXhhZDZrNWQ3YVREUS9aTHYrREJXbyJ9"],
            [700, "eyJpdiI6IlA2Qzk1T2NOejBaK0RKdDdjeWNOMWc9PSIsInYiOjEsIml0ZXIiOjEwMDAwLCJrcyI6MTI4LCJ0cyI6NjQsIm1vZGUiOiJjY20iLCJhZGF0YSI6IiIsImNpcGhlciI6ImFlcyIsInNhbHQiOiJ4eWV0MjBaTS9XMD0iLCJjdCI6IkxzTU9UamREdW1obGFzQ3FNb2ZBUFBpeWZCdFlNenFEYlVrVTBTby8yajB2Rlo4TnNCTTBrRUphZFNCMnpXbTdIY1hLdDh1UWprZ1EvbHlJamhNNUFHMm9OUWkrTXBFcW9NQkZPTCs3c1BUL1ZOUk1NanQzNlNpOTVJdzNHNmRhcUFENVhTd0xmQytCRGZQRjRpYVpGNnRxT2xZM2pyamg1VFJ5Rlgyb3gxSkI4ci9CT0tTcit1cFdpZTdQaXl5cDE0UEVyWGhIT0xhaTdFQ29RQW92QUtiSFJBSXZ0ZWdzNnlxRkhTTFlYd24wYkVIRFVxN3FsVHd0dVhtdVJDL2E2QldJMURRb2tnUllScnhUNmpTT0dHQm1JYm1HK3QwaTNxZjA1YTBhL0plZW9zYW9JeWJlTkNidWtoNmVPRlowRnhFeEozNDd3bmNDTTl1M3JtWEQvQklYTmhzQndQT3hKZEZVLytid2QxaUtNdVUrb1Z4eTJBOVpVVzU2V202RnRlQUI0T1EvWjJZZGp0L2Q0Sy9EYU9ZZ1BqK09jUWlIVWw5bFVxQTNrZUF0SjB4N2o5b2liSWtMUmdBVlZEWncvc1VEeGo5bi81cks0alJsa1BOcjd3TGFmcUpVRzh3UEpEcGgxckVRMmFFWjdUdnVCR1g5RGdxdkFyNUFiVE9WSjVrSEMyM3JiQlpnRk5ia0E2YU9HWVMyaXNHV0NpeTRoKzVMajFPSUkzVDFKU1pvVHNvUHAyQ3dwSXArR2JBb2xCdHNDbUlOb29FYkFpelpxUzU5TzJoZmRmaEVESmxjNTZ4QVVWMUhReEp6UlcycTZOTWw2TnlScTE5UDloQmlvOWdValYyZWQrN1c0cGd0emF3d2w2TGM2QllYbXh1TENHNkJxYUVQSk1SY0ZnYmRhZGgyOXNVT1VXM3NWNVRJbUdURk1JM1ZxZVFFdk9odU0zT1FLK2VkZVRwQitDeitXTGVURHhQazZ0TXRjbjRQTE8wMll1TWswaWFDR2pVd0FwRUxEbTI4WmZlc2xieWdsNVRobVg5aEhDdnUwbDNUU2VsN2JpZVZ0UDFtNjhlNlFaV2ZnU3ZSeUxtcVlvdExUUGxtTFplTWdUMElIVFhqdUMrVWk1S1YvUHIrRHVKMTlUYjcySjl1TmsxUTBFdmNNdVE9In0="],
            [-60]
        ],
        'f68998c9a36e890e4997c40f8e0a9a38ca9bce1ee4174176c9a66dc2b822ed61': [
            [600, "eyJpdiI6ImhhbzlUN2pHMmJSZStXQTk3N2pOdlE9PSIsInYiOjEsIml0ZXIiOjEwMDAwLCJrcyI6MTI4LCJ0cyI6NjQsIm1vZGUiOiJjY20iLCJhZGF0YSI6IiIsImNpcGhlciI6ImFlcyIsInNhbHQiOiJZWmtFNWNrWlJCST0iLCJjdCI6IjhMVkNGclZKYjJ1ZldjcnA2SkxRb1kwZlVtR3FFMFoweGFDdk10TGphcHJ6RGFpb3p2WG9IZ3JKalJWOCtYMVArT3Nhczd5YktlLzRVeEE5MTJlT0hhQnlZTXZiOHgvUkxOdVdSQ092ZU96b2R1SllkYS81TUlTMTZ1dGFNMTZwQU0wTm5RVUZqTW9pOHNuUDhjUUQwTkZTbDE5eitXaXl2M1dDQmlLRG5FYW9KR2FiQ25EaCtaaXBrSDN4VU90cHVObDZNalVjSHhmTTIxM3FSUlh2N1lBMWcxUGduZEhDbzhMM1Y4L0FTQjZiVkxNUmplRktxSks3cFVEVUJadzZjd1M5ZmFwMWFxUmhvc3JRaHpLUkl5akdLOHRkVE9Dcmd1OGhwaC9NNXM2V2cwSkhTam5wajU2M0Vjdm4rNEZ3elU5L3V6MW1RUHhzZTVHekk4MHBBWVhOTndpekxDVHRkN2RqUUpJYUtDM1dMMnB3RGg1cnQyWWo0d1BERnh6a3N2WmdOUEsrMCtxSmxBWlVsZ0NaaHFqeHhCNFd0dTQ2RmlldHdTUUV5WnZkQXRtZ1k1OFBLazhGYnVRU3VLWkpTb3d5QStHNHF1Zmw4Yk5xcXc0YzdwbmZvbE8wblhjWVNuMHFVaEFvMGxiaS9XNVMyMjVyVmUyZFFTOURQRjM2RFp6enpXVVhWNStzMXowZHpqeHZURmNVUnNwbSt2UXJpM2hzT24wNm4xZ1d1d2ZKS2R2cHZtQzJCYmwyUkNVSmJNVkg5dlBtRmU3MTA1TjErNVJlZlJNaXhMc2cyZHlYQ21QTUNHNWttcit4MWc1UVc4M0lZSDloU3BLUy8rMklYVGNwaHNOUG8zQ3hBZjdhZWZwUzVIQXhvWWpORDJNRUs1NHZTVC8wQkQrRnJLUk1SNWNLM0NBPSJ9"],
            [-500, "eyJpdiI6InIzN3lLODRjNm9qVDh6dVI0bXFRSlE9PSIsInYiOjEsIml0ZXIiOjEwMDAwLCJrcyI6MTI4LCJ0cyI6NjQsIm1vZGUiOiJjY20iLCJhZGF0YSI6IiIsImNpcGhlciI6ImFlcyIsInNhbHQiOiJZWmtFNWNrWlJCST0iLCJjdCI6ImVacXQrWWs1SHk5VzFnL3lvU292WjRMVC91RDFNSkc1S251Y0VSWnRTZkhCU1E9PSJ9"],
            [-150],
            [700, "eyJpdiI6Im11T3UxVmJTbXEwNVAvby9IVkZ1eXc9PSIsInYiOjEsIml0ZXIiOjEwMDAwLCJrcyI6MTI4LCJ0cyI6NjQsIm1vZGUiOiJjY20iLCJhZGF0YSI6IiIsImNpcGhlciI6ImFlcyIsInNhbHQiOiJZWmtFNWNrWlJCST0iLCJjdCI6IkJjZUtNcWFCa2JjQ2VmeDlqVHJvT3ozQWhDVG8vY01NNVVyN1p2eTNHTDB5VHd0emhnbTFqMUZZb3FHV3BibzNpOGFERE95VTdKV0t0WHdXc0tSM1FvSzIvSkdoaStuN1lwbWM3NEQ3REoxbmlra3J6MjJxQmJKeTFWcmk5RTRQZFhXdGsxTzdqZi9uQk5JQ2dKcmczeXhIT2plQ2FrSmJNSUtyVjZHNUpiS29WcUtMdWZiZWNJVHF6MytlOVhTYThsbFVXZnBLbDFGTmtkenFtZFdQa21aK3hWdHdhR2Q1OWZyZUNYZ09RRzA9In0="],
            [700, "eyJpdiI6IjllT2ZkQkY1NWtlSDJ4T0xwWU5ZNnc9PSIsInYiOjEsIml0ZXIiOjEwMDAwLCJrcyI6MTI4LCJ0cyI6NjQsIm1vZGUiOiJjY20iLCJhZGF0YSI6IiIsImNpcGhlciI6ImFlcyIsInNhbHQiOiJZWmtFNWNrWlJCST0iLCJjdCI6InBPREVPVzhLaGtjSSs0TnR0UXhiaTEzT1czSzNFZGlCRnhiakY5VFd4aGNPMzBLZ0EwbjYrRWFqQ3paSG1KYWRBaW1KSDA3c05FWmdrcmdZaU9CVlR6S0hWRXVxT0ZaNk1tb1dxQytNM0tXVldibEhjUUFPU0dRMldndTh5cEhYWFN3cHludkxlNk84QmZ4WkwrckJjV1F2UzRoVXRyZ01GRVFnaHJqR2Q2clZnUGxQWURTRzdJeHh4SjBVejhBZzVhT1B2Nm53Tk9BRlBOS1lTWVZUWjY2L0Q3emx5eEJSeVNOZ0x5NjVkYkpmQ1kzSzhBcG5rRVpCdFQ2SVc5Z0szMjBmQzA4ZkRMaXhVYm5nQjFvelFMaC8rdFN2SmdYcm8yTmt2VHZTSitmVGc3WlhnenRNeXNUOUN6ZFd5eE5IYnBYaWhaSVNpSEljOGFxakM2cXROOEtaVDlSZHVSM3NkYnQxd1hQUzFqTWJTUHMrbXp1R3AzUUI5UEtZQzM0ejM2bW1Ib0FPMWZCY3dEMzkyeXNEenNUdzVOcW5ZWXpXcURQb1pLb3NicmtGMm5TUnZ6b3cxbDJ3ampjWlg1aE9MRi9sWDUrTUZWOTBZQ0ZzNkpCOHA3UHM1SHRIa2lUV0JNaDJPRUxZNER3bnlxS3hMTFMzWnpyZDNsdGR3M0ZCM0xNUWNCNkFHNG93MzJ5aTNyU3l6bTREU1I5VHBCd291Vm1rRTZqQzN2R0dnd3M4N2FLTWRaNytYWU9rT2NRK2J4RlZ6SEZHcnorNWNzQW9wOEFqU1ZNUGZRRVpZMDNpRDBmSmtnemx6S3N0a3dzaWdHTFFzQTIrOGIrMkh4YlNRcWpMNkh5akVoUkx1Um5xSlE4S1BPWWRYMk0wNllScXQyOWpSMlBrV2NETHFtRU1WQmcvd3ozMHN4WDl5MFhXZVN5Vk1LNTZ5TzhXRHc1YjJ0cnd6QXJBY3E1ajR4YnoifQ=="],
            [-60]
        ],
        '60fa036b0406499b21a3a2d9f91e0e6d766aeb4ca43df38da9858e0fa81e330b': [
            [-150, "eyJpdiI6Imx2UXZBdjZjYnB0NnNhVmgreGU3YlE9PSIsInYiOjEsIml0ZXIiOjEwMDAwLCJrcyI6MTI4LCJ0cyI6NjQsIm1vZGUiOiJjY20iLCJhZGF0YSI6IiIsImNpcGhlciI6ImFlcyIsInNhbHQiOiI3eVVBRGdpM1J4ST0iLCJjdCI6IlBYQ0ZJNnFyd3lQVE14ZlRieUwxMmFocjhPSkdrZzZ3TFBUMWl2Yjk1QjdHWWkveXk1dHVtZjE1VTMveEoxSlhWUG56d0wyNnNWVzFSdTZWK0pnZDBweWVDdjFzZ0dzRjRYNzQxNVI3WDJoeXJROEI1K0hWWTZMTWhkR3RwUjZQOHh6Uk93PT0ifQ=="],
            [350, "eyJpdiI6InorZFhFZGdGL0VlUEZqdHVhY2g4UWc9PSIsInYiOjEsIml0ZXIiOjEwMDAwLCJrcyI6MTI4LCJ0cyI6NjQsIm1vZGUiOiJjY20iLCJhZGF0YSI6IiIsImNpcGhlciI6ImFlcyIsInNhbHQiOiI3eVVBRGdpM1J4ST0iLCJjdCI6ImxibzBTdmFNNmRjVnZXUGIrT3RnTW5TcElaTklWMHV1VXN0dE1LTm9Udm1qSjlZN0JST3BFK3NVbE5KM3VCVEdBa3FPb3c9PSJ9"],
            [-40, "eyJpdiI6Ik12ck5nNU1pQ2dET2MwRm1FZVJIY1E9PSIsInYiOjEsIml0ZXIiOjEwMDAwLCJrcyI6MTI4LCJ0cyI6NjQsIm1vZGUiOiJjY20iLCJhZGF0YSI6IiIsImNpcGhlciI6ImFlcyIsInNhbHQiOiI3eVVBRGdpM1J4ST0iLCJjdCI6IkhPMHlXaERwOFQxU0pkWEJPQ296cUZrPSJ9"],
            [600, "eyJpdiI6IjZOTEpXVjdoMmRaZHcxU3gxbHVPUlE9PSIsInYiOjEsIml0ZXIiOjEwMDAwLCJrcyI6MTI4LCJ0cyI6NjQsIm1vZGUiOiJjY20iLCJhZGF0YSI6IiIsImNpcGhlciI6ImFlcyIsInNhbHQiOiI3eVVBRGdpM1J4ST0iLCJjdCI6ImpoSll4ZW1MQTZuTFRzdHgvdmNGSlhOSFZKeGE2NnlyQTY5VFZkUHRLaUJpWGQvcmxtUU90YWxBVHlRPSJ9"],
            [700, "eyJpdiI6InBOakpNR1FGMmdHUEVuQ0NoWDBkV3c9PSIsInYiOjEsIml0ZXIiOjEwMDAwLCJrcyI6MTI4LCJ0cyI6NjQsIm1vZGUiOiJjY20iLCJhZGF0YSI6IiIsImNpcGhlciI6ImFlcyIsInNhbHQiOiI3eVVBRGdpM1J4ST0iLCJjdCI6Ikh6S1NRQitzczV5WGlEaDVtMlY5Z0FuZ0hWOUtPSUR5cEdXMEVrUGlPZ21LNHNiZU5lcDRaUXM4d0lYYThmdVdMYmc4a1g4Sm12SVpBZVJxekp0eUM5ZFlqbldpMHpEM1VMZmdMUlp5MmlvZGFKTUJDNXpIYTNuOWZSVzV1M2NEd3NmbERaLzExTm53RkxHOTBQdDRUd1ZQbS9jK2w3MXYxZlhYeGRidmx5c2k2M01xdEZ1S1U5MGl6UWp2NE5kcDU2U1VPRElxdDdQeElTWUlvdktNM2xwSGtvY0kxVU5YSlJsb0Q5d1NLZGNuT2pLWlVreEM4SU90bnltS0FldXBWdWdOMklPTVNqR1MwYnh1RVF2Z3JCUG1vdjVkRldreXU2REpwTzVKSHJsb2RzTW1KRjh1bmxzdHZrKzJvOXAweitaaDAyNnFndllRcWJUUjVNa1U1Rit1Sno2eUVoSy8vVmJHeVhSMDBYUURVYzBvU3VyNjEwYnI0Zk1QN2N2THJCa05PbVVSZ0thQ1dFSFNjdW5oaDBLSUVLdDN4TzU3WkFaVkFENWNnSHV4aW5kUmFLdFBNY3REcXFuNzhRTkd1SlFlR1gwRHBvVUtCS3pOMHIvSEFMSmY5MW9QOFpMdldlb3FsdjdiK2doZlBZYjljMWljdlFacjNhRk96WWpXSWFGWWRhNkVwODdFQVlzaUxiTENqL0R2Rm9WMy9MbWRNN0daTkcxajF1c29NTVJYSlNPc0NBTTZ0ekZGSHhpQXlabWM0R1dJaWc9PSJ9"],
            [-60]
        ],
        '081b877e29a3f60575ae84c54c5165be34f9c714f12ae74930ddb0956b696049': [
            [300, "eyJpdiI6InVYMUxsaTZBcEZ3eUFWdmp3Qk84aFE9PSIsInYiOjEsIml0ZXIiOjEwMDAwLCJrcyI6MTI4LCJ0cyI6NjQsIm1vZGUiOiJjY20iLCJhZGF0YSI6IiIsImNpcGhlciI6ImFlcyIsInNhbHQiOiJjR1hYcmEvWTE1bz0iLCJjdCI6IlJFZUtwS3YvTmZZb1BTakxkOWgrQXptSllWSE80YnJYbE9NSVh6WE5xQ0RQOW5rSTJZQVhKODNmSGkvR2RHM1hvMDdwYlhOVURMaU1rdjFkTnJvWlJoWU0zVGZTUmhrVkFSU3B2VEh0V0MvL0lwL29mUFhZQXhyc0EvblZHS1ExNkN3Z05RTHlvVi9mRFBLaFFnY3pPZ3RVcUtWMlB5cG5MZHhYL2VLaDExN3pTV0Z5MVZacUdrUVNCc0taL3pHVEptd3RRejBmMCtER09JSERWajBwUVBYbHR1RHpvOVYxR01LUUhabnphWS9WY0dhcHNpWHBLVXUwQXJUaS9RL0hNTStBMDFjNGVLNDBIcGxPZXZTZUZGOThmWTNqZHhSZ3l6TjVmZ3ZnbGRRQUJXTVZXdnZ4L3lrZWk0eXZ0RVNsOXA4L1BxOC9qM29aWmwzT3pSd0NYd2pQIn0="],
            [350, "eyJpdiI6InBBQm05bFJkTExlbHV1OS8wVGttbUE9PSIsInYiOjEsIml0ZXIiOjEwMDAwLCJrcyI6MTI4LCJ0cyI6NjQsIm1vZGUiOiJjY20iLCJhZGF0YSI6IiIsImNpcGhlciI6ImFlcyIsInNhbHQiOiJjR1hYcmEvWTE1bz0iLCJjdCI6InNhaGhNaDhJckRJcldmanlJZElCcDhkQTViM1dScWZtREhsaHJLa0FZWFJRL3ZCVDdDMElOYUc5eE1IUlhIWlNvV1FvYnNFPSJ9"],
            [-40, "eyJpdiI6IkVwVE05Tm5VK2l1OS9ZbXVva2JJT1E9PSIsInYiOjEsIml0ZXIiOjEwMDAwLCJrcyI6MTI4LCJ0cyI6NjQsIm1vZGUiOiJjY20iLCJhZGF0YSI6IiIsImNpcGhlciI6ImFlcyIsInNhbHQiOiJjR1hYcmEvWTE1bz0iLCJjdCI6IlM4aFJ0QTZuM2xvNEw0Z1VXV3ZZRDdsYWxabFpzNVU9In0="],
            [600, "eyJpdiI6ImJxVTBNeFpRMGJNSFo4cG9EeTJWcHc9PSIsInYiOjEsIml0ZXIiOjEwMDAwLCJrcyI6MTI4LCJ0cyI6NjQsIm1vZGUiOiJjY20iLCJhZGF0YSI6IiIsImNpcGhlciI6ImFlcyIsInNhbHQiOiJjR1hYcmEvWTE1bz0iLCJjdCI6IkxQc0JWZnpaVm10WTNSRHhjMkF5QjBCek9Dc3dFRk5NRnAxcGlVUkwycW15TU1wYkNSVmFBY0JmdHkvZjBtOHpET0lsYVE2M3JWTWRpTFJtRXVoMzNuVjREenVwT0duQldqUkxvdFhpdktTR0d1L0ptdUtpUk1DMkRkdFI2alNUeE9PRmlVV0NoQWM9In0="],
            [700, "eyJpdiI6ImdVSll1RjlXRERIQ0dOTkdra1l2dVE9PSIsInYiOjEsIml0ZXIiOjEwMDAwLCJrcyI6MTI4LCJ0cyI6NjQsIm1vZGUiOiJjY20iLCJhZGF0YSI6IiIsImNpcGhlciI6ImFlcyIsInNhbHQiOiJjR1hYcmEvWTE1bz0iLCJjdCI6ImF5bmxhUGkxc05hTGVWcXB1SDcwS1ZlbEZEeEdzbmlqUXhkSjBPK0I0Ry83VERCTXNZSGErK2JNMzFXUGExclBXNUhEcnhwUTdjc2JVaTh0ZzBRbktHbWpEN1prQzZvZi9rR3JtWHFhRDBTbHR1RWlMenBKV3pON2FEdVNMRkN6b3kydzBoU3pHVEVPc1A5eWVWTWNzMGI5dTFFWGpxQVFXSWd0NHErYVVIeCtNMmNmTWZqSmRZVmZ1RllBNHEyRjV5VFRqeW0rRGRPMzl6K0dKN0t0UmlBZ0NJRG4xSmxPdHkrR2NQYTVoVjArdEo0TUg2MktnNlRKeDF3NWtVUW9IMllsdGxXTkVoZzNIQ0lwQWg2dk44NzJZNGs2QVZmQWx6WGQ2M1VxS1Roa2YxckdMdFpLay9lNDJTaXZhMTFsc2ljN3p2Vm8rQzg5ZXFQQmJyNmRsQXNLaDE0RGRuYmhGOTVBYnBhZDZ1VDdiN2s3Y0NzV1F0N1ZZcG81MTBkWEZCcHEvekNyY1RLakN2alRIMjNZYnBlZHY2dWZ6VWRqT3VIQkZqZHplZFZleXo1TFN4TkJDS3ZvMG5DeHBmZFR4TENzV3pmZFROVFY2OUUxREs0K2R0bHB6VWxTc2JEVVdQak5lMFhuempSWE9heG5YQ0QrMnJUeW05N1NPcm9vUUJxbVJmV3lFSTNqY2ROMDF3MWlacEk1RlhIeTM0elprMThTMG43bFRyazV3clVTSTBKNHBnd0htVXdwT1BVRkRTQ3hFT1M0RWtIV2xGL3YwVUtHUGhPcDZGSHdmMk9yR1laRzNkaDBDVG9nbGhYZENxTnd4eVpRdWd5MktKZEJJb2lSMksyeEdEMWRWaW0ydEVvbWR5enE3SHFDMm5iN3BNbFFUMm5seTlHSVZOb1htYjRCNFpYOTRBMkMwbEIrZ084VU8ycENWOUJDTVVXM1pROHNIVkxxajlkTU03dWNpaVBxQUNUYW1VVmEvSlkzQXNOcTlPd0tlWXVTMTlRM1V4Zi9pUDNXdzQvMDIyWkdjYms3NVp0ZUF4YU1pMmgxL2JMcktXeTErZ0VWQ1B1cGE0WTFZYzBNa0l6eWhvUk9vYU1KMnJGdTZ3ZExrK3BsRkFIUnhZYVNyVW1ybllJTis1YzZ4MWNyb0NUZVRqbS9VUT09In0="],
            [-60]
        ],
        '34b3137e9334acfa2281b66dbee778bd195fe0a187b916c104203681a45000f4': [
            [-30, "eyJpdiI6IjBlem90UEVhZVJobklIbXBCOERsa3c9PSIsInYiOjEsIml0ZXIiOjEwMDAwLCJrcyI6MTI4LCJ0cyI6NjQsIm1vZGUiOiJjY20iLCJhZGF0YSI6IiIsImNpcGhlciI6ImFlcyIsInNhbHQiOiJTM3ZZQXNGUUVBbz0iLCJjdCI6IkNsbjBod3lySHk3ZTJEWnllZ2ZGenN0MHh5YkdOM3k0a1JMbCJ9"],
            [500],
            [-60],
            [700, "eyJpdiI6IjYxb3pKNUhkZmlJdDE1MUtMbmJ5a1E9PSIsInYiOjEsIml0ZXIiOjEwMDAwLCJrcyI6MTI4LCJ0cyI6NjQsIm1vZGUiOiJjY20iLCJhZGF0YSI6IiIsImNpcGhlciI6ImFlcyIsInNhbHQiOiJTM3ZZQXNGUUVBbz0iLCJjdCI6IkIvMERtd2Rsa3pYb0JsMzFoSGwzdGhZYXlvTEJYME9XUTBDOXlNaWVPb1p0ZllVb0FFNnJaVUdGS1puSlZEdEo5V3JZK1o1aUJsMHQ2YlRaWjlzektHeCtVWlpaYWpFUUJYVWorOFlwN2g5QUNBS2JDcmRneThTSjREelcifQ=="],
            [700, "eyJpdiI6IlA4MEszWXZWanlxbVBIWmpXYWVYWXc9PSIsInYiOjEsIml0ZXIiOjEwMDAwLCJrcyI6MTI4LCJ0cyI6NjQsIm1vZGUiOiJjY20iLCJhZGF0YSI6IiIsImNpcGhlciI6ImFlcyIsInNhbHQiOiJTM3ZZQXNGUUVBbz0iLCJjdCI6IkU3REE0UWdrL0JxdEtMTDlDRXlJamM1NXlHUzZ3bG14NUxtMk5aT2dTSEp4TkRiNDlnUFpON0NYT08xZG5yVXlTNDYxNEczOWxLK2NVMFZXSjhHRFRKVll1UEhJNm5CT0pkWFZtdnpqMTVlYk5QUnRXOTU4Vmlxem1PYkVSZmhKZjNrdkovT2t2N1BUeFhManpQNXkxSS9MZkFzQ0pqS3ZLNnFiT1Q3S095ay94Y3VkUmJrWFcrOTJXVWRILzBzMnRIRy9VcDF1T0V2cEVhdUE2ejJnUWdMMTZGQ2M4TEpnTzB4YU85SzRSSzhHekFLZExYd3VDOUtsZlBwS2VlcVJ1bE1wbTFRaWFrZW4vdmF1cUlSa3hVSkljTE0zL0prK1REZ2Q1TXh2dHd3SlRNZUNlRmRpSmFBa0NTbEt2WXFNREtkWFliaXpXS3BQUDhkUUxoVkZrcHhsb1czOEtWTklpYlhocWFTanFmYjI3UVVUdEU1MTNLSm83cC9OQnA5ZHdpeXpTdHJZY09aRlpEUEJ4bnVIQk1JS1VpZlNSc254ODVFS0VUVnpod29NbDBtS3JJOFZxaWhxc3NRRmpsUklkejJrM0F3SG1iQkNxYWFZcjFpdmRSZmVDVUtGaitHYkZ0dG9sQ3lpK1hrclVnaFYwNlZnRzkyYnZDK2Z3ZTVNWDF0aWhPTmFtV1E3Yis4TUpaQ2ZZOTcwOEhDRktBeFFJRGplYVRXV0RHNWpBUnFEcGJNVlNES1I2NER3QXpNU05IekpoQjU3c3U0Y1plQlFhN1EwR2YrNG9nQnY4d0N4dVZkejhlblpINm8wci9lblgyR1FTRlp0SzlRbWM0ZmVlZ0dBOGpNMWdqQjlwclB6Ym5FYzc4empQZXhYWGhNL1VQQ2tTc3gzd0ZsTUJpbFdqbDRtZ1JXei9QMTM1ZzBNdXJSdlhidVl2aXlEbmdQWFQreFFkVENJa2haWmI1RHBrZHBiSlA3UUVzcXBuZ1lNcGRnS0pvZW5QK1dNZ2ZUZlpHbitlSDF6RWxKM1JMdEliRS9oWEl0Z2YrdGNwUmxPZzBxNEJzdnZNTHV3VFEyRU9KVEYzbmh4OEljTkFYUmxTRVZlR1JUdTJKVS9hMFV1cytTQkVqWVk1bGc5ZDg4TzhHbDg5SlhkNDdKcXFVNGR0bEpaN2U5eGZRPT0ifQ=="],
            [-60]
        ],
        'b5f29fdc6bd180e1c4e613f18446ba8e868326542731b28464e12c5d601b0c13': [
            [600, "eyJpdiI6ImN5NzIvTGVlT3RqaHJMa0Z1R1FnRVE9PSIsInYiOjEsIml0ZXIiOjEwMDAwLCJrcyI6MTI4LCJ0cyI6NjQsIm1vZGUiOiJjY20iLCJhZGF0YSI6IiIsImNpcGhlciI6ImFlcyIsInNhbHQiOiIyZEJMWXRnUS9mUT0iLCJjdCI6Im1IK3I0aGJ3UUp2NlV4TXBqVk5rNU5ybWNMcHVaK0pJZDB6Q3Q2YVJYcHVnd09DWmNTS1pZQ205YnRvVmhzOUV5SGVtYmJxVXdnVUp6Ni9mM2M5UnRCaERNSk8raDByNnA2RDhkL1c0eHFqcmR2QmdZL0gvYmk0VkxkU3BDZlBncDd1c3NlNFBQM1psNi94cnVhR2oyemdLODFBQXZxeGhsdUYrei9PNXZJQkY2MXpQNTZnamhOZlpSdGtYUWFNbFk5RURVZVV6TFpROS90bTl5aHlkMTJsWlVGem5MWkZHUUpqNTJabTJmNG5BMVZEYmhjR1NtZ2hKR0JaSGg5VU04ZU83eGRCTXNYYytmVDRiUENUM1R2V1FFTzZyUUMyemNyWjdCWDg2bmVoc3g5SVN3Zit3YzZWQXdDVyt5YnQzMUVBKyJ9"],
            [350, "eyJpdiI6IjdjYW9RMWRiR3dyZkh4aFZ0WHNiUUE9PSIsInYiOjEsIml0ZXIiOjEwMDAwLCJrcyI6MTI4LCJ0cyI6NjQsIm1vZGUiOiJjY20iLCJhZGF0YSI6IiIsImNpcGhlciI6ImFlcyIsInNhbHQiOiIyZEJMWXRnUS9mUT0iLCJjdCI6IlI1aXluRlR6TDdMZGhLQTJmU21vYVJtSmtMMDVEUzRKZVI3bE1MdVdTZFRYWWszbVRBdWp4Wlp1ejMwM3NaN3RYU0drdFpFZFpFNW1OcHhMcFhZR014QllFSTlKN1F1ZUFJQ1JoU1lLeitSSFNWOTdkNGhwL2t1Q042dUIzem10ZGk2NXFoUDBjM3BDQzhPOGtiSDl3UT09In0="],
            [-40, "eyJpdiI6IlV5V0dOWk52eW5mN2hJWDVWYU53M3c9PSIsInYiOjEsIml0ZXIiOjEwMDAwLCJrcyI6MTI4LCJ0cyI6NjQsIm1vZGUiOiJjY20iLCJhZGF0YSI6IiIsImNpcGhlciI6ImFlcyIsInNhbHQiOiIyZEJMWXRnUS9mUT0iLCJjdCI6InVlRTNhclBXb3hJM09wZ3ZFQS9MMWNMcXI2SnZsVGs9In0="],
            [400, "eyJpdiI6Inp5OC80dnN0VzZRWmU0RWhvSC84aUE9PSIsInYiOjEsIml0ZXIiOjEwMDAwLCJrcyI6MTI4LCJ0cyI6NjQsIm1vZGUiOiJjY20iLCJhZGF0YSI6IiIsImNpcGhlciI6ImFlcyIsInNhbHQiOiIyZEJMWXRnUS9mUT0iLCJjdCI6Ik0zZmM1L1VZbTZDVnR0d3pUb3FaR2U4YWVleW5rL2pvSjc0eHNxTHQrVnR5Q0ZKc0d6dEt4R0E5YWIyNlcvc3V3Si9NSUZlb0FaY3BOeUV3WVVvMG1wVXRocXhXYTRzbm1JTWdHTUpnNkRsSlVNanBsSUpTK0pPSTRwVVdrSmVKcnpFaEl2TW44RnlsSUpuNzlBPT0ifQ=="],
            [700, "eyJpdiI6InlGWEtPYzU5UDNNQmpnSGxpNGc3d1E9PSIsInYiOjEsIml0ZXIiOjEwMDAwLCJrcyI6MTI4LCJ0cyI6NjQsIm1vZGUiOiJjY20iLCJhZGF0YSI6IiIsImNpcGhlciI6ImFlcyIsInNhbHQiOiIyZEJMWXRnUS9mUT0iLCJjdCI6InFtUjA0dDJ0bWYzcEpRK2RHbWJQbkZRNitDTytSa0w3Tlk1RWZzajBoT3JkVjYraDNoNDlVeDVsWDFKS1M4S0tWMFlicThROUMweDMyeG1Sb1FiMjhBZkowekdLVURYb0pBd3BOcjRRRlpnS0kvYStjRW0vTXhTaVZnN3RIZEZlcU1YL2RrQmtVQnNVR3dueGR0QmtSR0duNEVoOEpsUlpYWWhhN1hyNFBuTGJKYmlubTByckNoeThtcDJkbkl2NmZwSzdvWlVVNTBaNzZhOHFERHp1UjJiV2JxU2dxZFh4aHRRNEFhVGo5MzJVZlpSbDZEVFkyNkcxcTNRWkp4dnJKS0hraXN4S0tHeEdYMitiaXJlRi91NnluN091S3FnTWthZmxMRlN0aHVNZnFMeFNuUHREMXRZOVlacm0yNUJYMzFjU2xrVFM0RnRtejNvVDJjd0xZcERGZTY1c2lndGRWTmVyTEJZTmdYMExuNGVxYWlhOTgxajhWUDlzSFl5U093MDNQaEpGWUFZT0hwTHlCVkxnNVRCcDIwUko3OUQ5eGVYUnNMOXlKUlAxaWUzY0N6ejdLcVhDRXN3YjFMN092T01CcTIwRmV2TXZlSnYwVUVhZzVzUW1rdW5WNnRxQUx4YmYwTlRwK0dyUTdqRHhzeVRMc1pZZURRakxYOVZaejROTUNIV3MxbStSTGQ1Ry9HVTNiQ29McUw1TFU0dE9NNGUrMTl5dkxEdVlmbkVlbzJQYUJydFJ3NE03dktjU3Ria20xMm1nRjE3NmlFNFlsWGxYOU5lTTNxRmQxU0NYSkt2OVJVWjlJS3NkVk9rcUZYU3pwZkFxTUhmNzJtbUQzNnpnQnptaG84VHc2ZHdTUGpjTTUwTXFNS3NhcDNsRC9scXJqZWc3SlA5V0RSNnJubGFWSGFVY29qa2FYMUdmb0M1emtNMS9NSjJQR0tZVXlHdi90Y2l5Mlo3Y2dFVHlWaGdhTStlYWphQ0VCb08xaFB3b2hoN1I3S285cnp3Y01SNXo1RzNjNjc4V3NsUlJLd2tEYmtmcEVHSUZJbjg9In0="],
            [-60]
        ],
        '0a75d888554ec1680203255ed809d43c7af4dae3550cb46a2d9ac68b86703ee2': 'x',
        'e8749992cc99719ac157b47d78da99137bd3ab8eb971222988cb0b3d2a25d31f': 'x',
        'dd5cb83ad8fbcc76a44610633658236c5006bdf358081e2a8f33c37a7dd3b066': 'x',
        '9b9e643904273d3e7c81b074ce72150545191c666eaad3eed23ef98a99c665eb': 'x',
        '5bd23a80008aa890bb0d2f1e9e0fe0d35f75f3a951cbdc4971111c111085a8e2': 'x',
        'dbb51cac9f8ebe3a87554dac58efeb593fc7c3ab8aae93d9be096e055122c7b5': 'x',
        '6da1a727fe71db7b64d7e643a99402d482b35bd884e8727d995a94b7abe38b78': 'x',
        'f7c19131b4194d457694215a8a7f6a5bd3b63bcfbf0ac19b410d843fd0472280': 'x',
        '9fd0219f46a9553ee5dfaf070d124ff8d1dfdd78ea6cef4ec03180eb08181b69': 'x'
    }, ain = $('#answer'), aanim = 500, almost = {
        '542d306b26cd97b040c476228cc860efe74ac65eea8ac891c7a156f1a9be2263': 'x',
        'ac8629e35851c21b6e10fc9434156b4af28728b03a6dba19d3ec52cde5e66a74': 'x',
        '429ab95973ee2f2f2ae4fa83052184d92ea9c1c16ceb7f73981f354406615911': 'x',
        '87eab065bc644705dc3ada322a995bdd70048c8d35b93b5d9f336d06e4ec172f': 'x',
        '5ef6ac1e05fc11a3f3aeb4e244d8585f68d893408eed13d9e947d4901003bd87': 'x',
        'abe9385dfad26ef95fa30d086c0215d3c5e236db6d0109da3fe121cc1a5e4327': 'x'
    };
    $('#ansin form').submit(function(e) {
        e.preventDefault();
        var s;
        if ((s = submit(ain.val().replace(/[^A-Za-z]/g, '').toUpperCase())) === 'yes') {
            $('#anscont').click();
        } else {
            ain.css('background-color', s);
            setTimeout(function() { ain.css('background-color', ''); }, aanim);
        }
        ain.val('');
    });

    var submit = function(ans) {
        var hsh = sjcl.codec.hex.fromBits(sjcl.hash.sha256.hash('wowsalty'+ans)), ws, s, r;
        if (hsh === 'eb02043c5751074c045cb804e2875b076aab8084582362e34a38a30d7f5a142c') window.location = sjcl.codec.hex.fromBits(sjcl.hash.sha256.hash('wowsaltier'+ans))+'.html';
        if ((ws = corrects[hsh]) && (s = localStorage.getItem('sols')||'').indexOf('/'+ans)===-1) {
            addinv(ans, ws);
            localStorage.setItem('sols', s+'/'+ans);
            return 'yes';
        } else if (almost[hsh]) return '#cc8';
        else return '#c88';
        return r;
    };

    var addinv = function(ans, ws) {
        var hsh = sjcl.codec.hex.fromBits(sjcl.hash.sha256.hash('wowsaltier'+ans));
        var old = JSON.parse(localStorage.getItem('objs')||'[]'), o;
        if (ws === 'x') {
            old.push(o={u:'_'+ans,x:(Math.random()*300)|0,y:(Math.random()*300)|0,z:0});
            addimg(o);
        } else for (var i = 0; i < ws.length; ++i) {
            old.push(o={u:hsh+'_'+i,x:(Math.random()*300)|0,y:(Math.random()*300)|0,w:ws[i][0],z:0,t:ws[i][1]?sjcl.decrypt(ans,atob(ws[i][1])):undefined});
            addimg(o);
        }
        localStorage.setItem('objs', JSON.stringify(old));
        if (!invflash) invflash = setInterval((function() { var on = 0, f = function() {
            $('#invcont').css('background-color',(on=!on)?'#fff':'#79e');
        }; f(); return f})(), 500);
    };

    var sbdrag, sbdx, sbdy, dragged, addimg = function(o) {
        $('#sbcont').append($('<div>')
            .attr('id', o.u)
            .css({left:o.x,top:o.y,backgroundColor:o.u[0]==='_'?'#aea':''})
            .append((o.u[0] === '_' ?
                $('<span>').addClass('correct').text(o.u.slice(1)) :
                $('<img>').attr({src:'img/'+o.u+'.svg'}).attr(o.w>0 ? 'width' : 'height', Math.abs(o.w))))
            .mousedown(function(e){
                var old = JSON.parse(localStorage.getItem('objs')||'[]'), z=0;
                for (var i = 0; i < old.length; ++i) z=old[i].z>z?old[i].z:z;
                this.style.zIndex = z+1;
                sbdrag=this; dragged=false;
            }).css('z-index',o.z));
    };
    JSON.parse(localStorage.getItem('objs')||'[]').forEach(addimg);

    $('#sandbox').mousedown(function(e) {
        e.preventDefault();
        $('#cp').hide();
        sbdx = e.clientX;
        sbdy = e.clientY;
    }).mousemove(function(e) {
        e.preventDefault();
        if (sbdx !== undefined) {
            dragged=true;
            var el = $(sbdrag || '#sbcont');
            el.css('left', function(_,l) { return +l.replace('px','') + e.clientX - sbdx; });
            el.css('top',  function(_,t) { return +t.replace('px','') + e.clientY - sbdy; });
            sbdx = e.clientX;
            sbdy = e.clientY;
        }
    });

    $(document.body).mouseup(function() {
        if (sbdx !== undefined && sbdrag) {
            var old = JSON.parse(localStorage.getItem('objs')||'[]');
            for (var i = 0; i < old.length; ++i) {
                if (old[i].u == sbdrag.id) {
                    old[i].x = +sbdrag.style.left.replace('px',''), old[i].y = +sbdrag.style.top.replace('px',''), old[i].z = +sbdrag.style.zIndex;
                    if (!dragged) $('#cp').val(old[i].t).show().focus().select();
                }
            }
            localStorage.setItem('objs', JSON.stringify(old));
        }
        sbdx = sbdrag = undefined;
    });

    var spcss = {
        pan: {left:'3vw',top:'3vh',right:'',bottom:''},
        dog: {left:'',top:'',right:'15vw',bottom:'30vh'},
        hid: {left:'',top:'20vh',left:'2930vw',bottom:''},
        pnt: {left:'100vw',top:'25vh',right:'',bottom:''}
    }, sphtml = {
        'pan': [
            "Hello! My name is Pan. My father, Dr. Demic, had a very important message about <strong>how we can convey healthy habits to everyone</strong>! In fact, it was so important that he split it into several parts and gave them to <strong>6 different friends</strong> for safekeeping<a class=s href=# data-s=pn2>.</a> Unfortunately, now that social distancing is in place, all of his friends are scattered apart, all over the place. If you can find them, you might be able to reconstruct Dr. Demic's critical message! Will you help me figure out what he was trying to tell us?",
            "To the right, you can find your inventory, which you can click and drag to move around in (and drag and drop items to rearrange them), and a place to submit answers. Clicking on an item will allow you to copy/paste the relevant text contained in it, if any.",
            "...wait, inventory? Answers? Clicking? What does that mean? What am I saying?",
            "The message may be a bit hard to decipher... you know how doctors' handwriting is. But I'm sure you can do it!",
            "Do you wanna hear a joke? Actually, hmm, we're supposed to be quarantined, so I can only tell inside jokes.",
            "I'll tell you a joke now, but you'll have to wait two weeks to see if you got it.",
            "Hey, are you on Twitter? You should follow me! I haven't posted much yet, but I promise I'll become super popular. My username is <strong>@demicpan1</strong>!",
            "I really hope we can discover my father's message... he said he had this great idea for how to remind everyone to be healthy, and he was so excited about it.",
            "Do I have a piece of the message? Oh, yeah, I totally forgot! <a class=s href=# data-s=pan>Here you go.</a>",
            "My father used some pretty crazy techniques to hide his work while it was still in progress... it's almost like he was <strong>some kind of sourcerer</strong>.",
            "Do you like my dog? His name is Pepper!",
            "My father's full name is Alexander, but we call him Aca for short.",
            "Do you think you have all the pieces of the message? If you do, maybe <a href=meta.html target=_blank>this will help</a>..."
        ],
        'dog': [
            'woof',
            'woof woof woof woof woof woof woof woof woof woof woof woof woof woof',
            'woof woof woof woof woof woof woof woof woof woof woof woof woof woof woof woof woof woof woof woof woof woof',
            'woof woof woof woof woof woof woof woof woof',
            'woof woof woof woof woof woof woof woof woof woof woof woof',
            "Fine -- you got me. I'm actually a human hiding in a dog's body! They say dogs can't get coronavirus... I'm perfectly safe here.",
            "A message? Oh, yeah, Dr. Demic did give me <a class=s href=# data-s=dog>this thing</a>... I don't know how useful it'll be, but here you go!",
            "Always was a strange one, that Aca... I've tried looking at these, but I have no idea what they mean."
        ],
        'hid': [
            "You found me!",
            "What am I doing, you ask? I'm socially distancing... do you think this is 6 feet away from Pan?",
            "Ah, you must be <a class=s href=# data-s=hid>looking for this!</a>",
            "You know, there's another reason I'm this far away from Pan... it's like she has this way of <strong>hiding things between her words</strong>..."
        ],
        'pnt': [
            "Oh, hello!",
            "I'm hiding in this painting to avoid getting sick. You're the first person who's found me!",
            "If you reach through the frame, I can give you this <a class=s href=# data-s=pnt>strange set of objects</a> that the doctor told me to keep safe.",
            "Do you have any idea what they are? Aca didn't tell me a thing.",
            "I'm thinking if we want to find out, it might help to <strong>go straight to the source</strong>."
        ]
    }, spactive, spidx;

    var spfn = function(x) {
        if (x == spactive) ++spidx;
        else {
            $('#speech').css(spcss[x]);
            spactive = x;
            spidx = 0;
        }
        $('#sptext').html(sphtml[x][spidx%sphtml[x].length]);
        $('#sptext a.s').click(function(e) {
            e.preventDefault();
            submit(this.dataset.s);
        });
    };
    $('.ch').click(function(){spfn(this.id)});

    spfn('pan');
    $('#speech').show();

    var cls=[[5,6], [4,1], [1,5], [5,7], [3,1], [0,0]], clidx = 0;
    $('.cl').show().click(function() {
        $('#clok1').css('transform', 'rotate('+cls[clidx  ][0]*45+'deg)');
        $('#clok2').css('transform', 'rotate('+cls[clidx++][1]*45+'deg)');
        clidx==cls.length && (clidx=0);
    });

    $('#cp').blur(function() { this.style.display='none' }).keydown(function(e) {
        if (e.key == 'Escape') {
            e.stopPropagation();
            this.style.display='none';
        }
    });
});
