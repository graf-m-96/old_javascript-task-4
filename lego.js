'use strict';

/**
 * Сделано задание на звездочку
 * Реализованы методы or и and
 */
exports.isStar = true;


/**
 * @param {Array} collection - исходная коллекция
 * @returns {Array} - коллекция, полученная поверхностным копированием
 */
function copyCollection(collection) {

    return collection.map(function (record) {

        return Object.assign({}, record);
    });
}


/**
 * Выполнение запросов, которые выполняются немедленно
 * @param {Object} notebook - {collection, fields, queriesForEnd}
 * @param {Array} queries - запросы
 * @returns {Object} notebook - после выполнения "немедленных" запросов,
 * кроме запросов типа format, limit и удаления полей, не входящих в select
 */
function doImmediatelyRunningQueries(notebook, queries) {
    queries.forEach(function (query) {
        notebook = query(notebook);
    });

    return notebook;
}


/**
 *
 * @param {Object} notebook - {collection, fields, queriesForEnd}
 * @returns {Object} notebook - после удаления полей, которые не вошли в select
 */
function deleteFields(notebook) {
    notebook = {
        collection: copyCollection(notebook.collection),
        fields: notebook.fields,
        queriesForEnd: notebook.queriesForEnd
    };
    if (notebook.fields !== undefined) {
        notebook.collection.forEach(function (record) {
            Object.keys(record).forEach(function (field) {
                if (notebook.fields.indexOf(field) === -1) {
                    delete record[field];
                }
            });
        });
    }

    return notebook;
}

/**
 * @param {Object} notebook - {collection, fields, queriesForEnd}
 * @returns {Object} notebook - после выполнения запросов, которые выполняются в конце:
 * удаление полей, не входящих в select, format, limit
 */
function doQueriesForEnd(notebook) {
    notebook = deleteFields(notebook);
    notebook.queriesForEnd.forEach(function (query) {
        notebook = query(notebook);
    });

    return notebook;
}


/**
 * Запрос к коллекции
 * @param {Array} collection
 * @params {...Function} – Функции для запроса
 * @returns {Array} collection - коллекция после запросов
 */
exports.query = function (collection) {

    /*
    Допустим, что запись может иметь только примитивное значение
    Иначе непонятно, как сортировать объекты, да и просто жесть будет
    Поэтому используем поверхностное копирование, а не глубокое
     */
    var notebook = {
        collection: copyCollection(collection),
        fields: undefined,
        queriesForEnd: []
    };
    var queries = Array.from(arguments);
    queries.splice(0, 1);
    notebook = doImmediatelyRunningQueries(notebook, queries);
    notebook = doQueriesForEnd(notebook);

    return notebook.collection;
};


/**
 * Выбор полей
 * @params {...String}
 * @returns {Function} - ищет пересечение полей и записывает их в поле fields
 */
exports.select = function () {
    var args = Array.from(arguments);

    return function (notebook) {
        // копирование коллекции не нужно
        if (notebook.fields === undefined) {
            notebook.fields = args;
        } else {
            notebook.fields = notebook.fields.filter(function (field) {
                return args.indexOf(field) !== -1;
            });
        }

        return notebook;
    };
};


/**
 * Фильтрация поля по массиву значений
 * @param {String} property – Свойство для фильтрации
 * @param {Array} values – Доступные значения
 * @returns {Function} - фильтрует коллекцию по заданному правилу
 */
exports.filterIn = function (property, values) {
    console.info(property, values);

    return function (notebook) {
        notebook = {
            collection: copyCollection(notebook.collection),
            fields: notebook.fields,
            queriesForEnd: notebook.queriesForEnd
        };
        notebook.collection = notebook.collection.filter(function (record) {
            return record.hasOwnProperty(property) && values.indexOf(record[property]) !== -1;
        });

        return notebook;
    };
};


/**
 * Глупая сортировка (Нам нужна любая УСТОЙЧИВАЯ сортировка)
 * @param {Array} collection - исходная коллекция
 * @param {String} property - Свойство для фильтрации
 * @param {Boolean} needReverse - нужно ли поменять порядок в коллекции
 * @returns {Array} collection - отсортированная коллекция
 */
function sillySortInAscending(collection, property, needReverse) {
    var index = 0;
    while (index < collection.length - 1) {
        if (collection[index][property] > collection[index + 1][property]) {
            var temp = collection[index + 1];
            collection[index + 1] = collection[index];
            collection[index] = temp;
            index = 0;
        } else {
            index++;
        }
    }
    if (needReverse) {
        collection.reverse();
    }

    return collection;
}


/**
 * Сортировка коллекции по полю
 * @param {String} property – Свойство для фильтрации
 * @param {String} order – Порядок сортировки (asc - по возрастанию; desc – по убыванию)
 * @returns {Function} - сортирует коллекцию по заданному правилу
 */
exports.sortBy = function (property, order) {
    console.info(property, order);

    return function (notebook) {
        notebook = {
            collection: copyCollection(notebook.collection),
            fields: notebook.fields,
            queriesForEnd: notebook.queriesForEnd
        };
        notebook.collection = sillySortInAscending(notebook.collection, property, order === 'desc');

        return notebook;
    };
};


/**
 * Форматирование поля
 * @param {String} property – Свойство для фильтрации
 * @param {Function} formatter – Функция для форматирования
 * @returns {Function} - добавляет в поле queriesForEnd функцию, которая должна
 * выполняться в конце
 */
exports.format = function (property, formatter) {
    console.info(property, formatter);

    return function (notebookForAddFunction) {

        notebookForAddFunction.queriesForEnd.push(function (notebook) {
            notebook = {
                collection: copyCollection(notebook.collection),
                fields: notebook.fields,
                queriesForEnd: notebook.queriesForEnd
            };
            notebook.collection.forEach(function (record) {
                if (record.hasOwnProperty(property)) {
                    record[property] = formatter(record[property]);
                }
            });

            return notebook;
        });

        return notebookForAddFunction;
    };
};


/**
 * Ограничение количества элементов в коллекции
 * @param {Number} count – Максимальное количество элементов
 * @returns {Function} - добавляет в поле queriesForEnd функцию, которая должна
 * выполняться в конце
 */
exports.limit = function (count) {
    console.info(count);

    return function (notebookForAddFunction) {

        notebookForAddFunction.queriesForEnd.push(function (notebook) {
            notebook = {
                collection: copyCollection(notebook.collection),
                fields: notebook.fields,
                queriesForEnd: notebook.queriesForEnd
            };
            notebook.collection = notebook.collection.slice(0, count);

            return notebook;
        });

        return notebookForAddFunction;
    };
};


/*
 * @param {Object} thisObj - первый объект
 * @param {Object} otherObj - второй объект
 * @returns {boolean} - равны ли объекты по поверхностному сравнению
 *
function objectEquals(thisObj, otherObj) {
    if (Object.keys(thisObj).length !== Object.keys(otherObj).length) {
        return false;
    }
    for (var i = 0; i < Object.keys(thisObj).length; i++) {
        var key = Object.keys(thisObj)[i];
        if (thisObj[key] !== otherObj[key]) {
            return false;
        }
    }

    return true;
}
*/


/**
 * @param {Array} commonCollection - общая коллекция
 * @param {Array} collection - коллекция, которую присоединяем к общей
 * @returns {Array} commonCollection - общая коллекция, объединённая с collection
 */
function union(commonCollection, collection) {

    collection.forEach(function (thisRecord) {
        var commonCollectionHaveThisRecord = false;
        commonCollection.forEach(function (otherRecord) {
            if (thisRecord === otherRecord) {
                commonCollectionHaveThisRecord = true;
            }
        });
        if (!commonCollectionHaveThisRecord) {
            commonCollection.push(thisRecord);
        }
    });

    return commonCollection;
}


if (exports.isStar) {

    /**
     * Фильтрация, объединяющая фильтрующие функции
     * @star
     * @params {...Function} – Фильтрующие функции
     * @returns {Function} - находит объединение фильтрованных коллекций по заданным правилам
     */
    exports.or = function () {
        var filters = Array.from(arguments);

        return function (notebook) {
            var unionNotebook = {
                collection: [],
                fields: notebook.fields,
                queriesForEnd: notebook.queriesForEnd
            };
            filters.forEach(function (filter) {
                var currentNotebook = filter(notebook);
                unionNotebook.collection = union(unionNotebook.collection,
                                                 currentNotebook.collection);
            });

            return unionNotebook;
        };
    };


    /**
     * Фильтрация, пересекающая фильтрующие функции
     * @star
     * @params {...Function} – Фильтрующие функции
     * @returns {Function} - находит пересечение фильтрованных коллекций по заданным правилам
     */
    exports.and = function () {
        var filters = Array.from(arguments);

        return function (notebook) {
            filters.forEach(function (filter) {
                notebook = filter(notebook);
            });

            return notebook;
        };
    };
}
