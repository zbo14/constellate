'use strict'

// @flow

/**
 * @module constellate/src/translate
 */

const parseCSV = (csv: string, type: string): Object => {
   // adapted from https://gist.github.com/jonmaim/7b896cf5c8cfe932a3dd
   const data = {}
   const lines = csv.replace(/\r/g, '').split('\n').filter(line => !!line)
   const headers = lines[0].split(',')
   let i
   for (i = 0; i < headers.length; i++) {
       data[headers[i]] = new Array(lines.length - 1)
   }
   data.type = newArray(type, lines.length-1)
   let idx, queryIdx, startIdx
   let key, length, obj, row, v, vals
   for (i = 1; i < lines.length; i++) {
       idx = 0, queryIdx = 0, startIdx = 0
       obj = {}, row = lines[i]
       if (!row.trim()) continue
       while (idx < row.length) {
           if (row[idx] === '"') {
               while (idx < row.length - 1) {
                   if (row[++idx] === '"') break
               }
           }
           if (row[idx] === ',' || idx + 1 === row.length) {
               length = idx - startIdx
               if (idx + 1 === row.length) length++
               v = row.substr(startIdx, length).replace(/\,\s+/g, ',').trim()
               if (v[0] === '"') {
                   v = v.substr(1)
               }
               if (v.substr(-1) === ',' || v.substr(-1) === '"') {
                   v = v.substr(0, v.length - 1)
               }
               const key = headers[queryIdx++]
               if (!v) {
                   data[key][i - 1] = null
               } else {
                   vals = v.split(',')
                   if (vals.length > 1) {
                       data[key][i - 1] = vals
                   } else {
                       data[key][i - 1] = v
                   }
               }
               startIdx = idx + 1
           }
           idx++
       }
   }
   return data
}

exports.parseCSVs = (csvs: string[], types: string[], tasks: Object, t: number, i?: number) => {
     if (csvs.length !== types.length) {
         return tasks.error(ErrDifferentArraySizes)
     }
     let a, b, key, keys, length = 0, obj, val
     const combined = csvs.reduce((result, csv, idx) => {
         obj = parseCSV(csv, types[idx])
         keys = Object.keys(obj)
         for (a = 0; a < keys.length; a++) {
             key = keys[a]
             if (!result[key]) {
                 result[key] = newArray(null, length)
             }
             result[key] = result[key].concat(obj[key])
         }
         length += obj[key].length
         return result
     }, {})
     const objs = new Array(combined['name'].length)
     keys = Object.keys(combined)
     for (a = 0; a < objs.length; a++) {
         obj = {}
         for (b = 0; b < keys.length; b++) {
             key = keys[b]
             val = combined[key][a]
             if (val) {
               obj[key] = val
             }
         }
         objs[a] = obj
     }
     tasks.run(t, objs, i)
}

exports.parseJSONs = (jsons: string[], types: string[], tasks: Object, t: number, i?: number) => {
   if (jsons.length !== types.length) {
       return tasks.error(ErrDifferentArraySizes)
   }
   let arr, j
   return jsons.reduce((result, json, idx) => {
       arr = JSON.parse(json)
       if (!isArray(arr, isObject)) {
           return tasks.error(errWrongType(getType(arr), 'Object[]'))
       }
       for (j = 0; j < arr.length; j++) {
           arr[j].type = types[idx]
       }
       return result.concat(arr)
   }, [])
}

const toCSV = (arr: Array < Array < string | string[] >> ): string => {
   let csv = '',
       i, j, k, val
   for (i = 0; i < arr[0].length; i++) {
       for (j = 0; j < arr.length; j++) {
           val = arr[j][i]
           if (isString(val)) {
               csv += val
           } else if (isArray(val, isString)) {
               csv += '"'
               for (k = 0; k < val.length; k++) {
                   csv += val[k]
               }
               csv += '"'
           } else {
               throw errWrongType(getType(val), 'string|string[]')
           }
           if (j === arr.length - 1) {
               csv += '\n'
           } else {
               csv += ','
           }
       }
   }
   return csv
}
