---
label: Core
id: Core
categorySlug: Classes
categoryLabel: Classes
categoryRank: 
documentRank:

## object Core
    
    isElement(obj) : Boolean

    uuid(): String

    values(object): Array

    resolveUrl(base, path): Url

    documentHeight(): Number

    isNumber(n): Boolean

    prefixed(unprefixed): Array

    defaults(obj): Object

    extend(target): Object

    insert(item, array, compare) => inserts-a-number-into-a-sorted-array : location

    locationOf(item, array, compare _start, _end) => Returns where something would fit in

    indexOfSorted(item, array, compare _start, _end) => Returns -1 of mpt found

    bounds(el): {width, height}

    borders(el): {width, height}

    windowBounds(): w = window {top: 0,left: 0,right: w.width,bottom: w.height,width,height}

    cleanStringForXpath(str): String => looking-for-text-with-single-quote

    indexOfTextNode(textNode): Number

    isXml(ext): Boolean

    createBlobUrl(content, mime): Url

    type(obj): String

    parse(markup, mime)

    qs(el, sel)

    qsa(el, sel)

    qsp(el, sel, props)

