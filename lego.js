'use strict';

/**
 * Сделано задание на звездочку
 * Реализованы методы or и and
 */
exports.isStar = true;


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
    if (notebook.fields !== undefined) {
        notebook.collection = notebook.collection.map(function (record) {
            var copyRecord = Object.assign({}, record);
            Object.keys(copyRecord).forEach(function (field) {
                if (notebook.fields.indexOf(field) === -1) {
                    delete copyRecord[field];
                }
            });

            return copyRecord;
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

    var notebook = {
        collection: collection,
        fields: undefined,
        queriesForEnd: []
    };
    var queries = Array.from(arguments).slice(1);
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
        notebook.fields = notebook.fields === undefined ? args : notebook.fields.filter(
            function (field) {
                return args.indexOf(field) !== -1;
            });

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
        notebook.collection = sillySortInAscending(notebook.collection.slice(), property,
                                                   order === 'desc');

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
            notebook.collection = notebook.collection.map(function (record) {
                if (record.hasOwnProperty(property)) {
                    var copyRecord = Object.assign({}, record);
                    copyRecord[property] = formatter(record[property]);

                    return copyRecord;
                }

                return record;
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
            notebook.collection = notebook.collection.slice(0, count);

            return notebook;
        });

        return notebookForAddFunction;
    };
};


/**
 * @param {Array} commonCollection - общая коллекция
 * @param {Array} collection - коллекция, которую присоединяем к общей
 * @returns {Array} commonCollection - общая коллекция, объединённая с collection
 */
function union(commonCollection, collection) {

    collection.forEach(function (thisRecord) {
        var commonCollectionHaveThisRecord = false;
        commonCollection.forEach(function (otherRecord) {
            // так как мы элементы меняем только в format и после удаления полей, то можно
            // сравнивать по ссылкам
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
                collection: filters.length !== 0 ? [] : notebook.collection.slice(),
                fields: notebook.fields,
                queriesForEnd: notebook.queriesForEnd
            };
            filters.forEach(function (filter) {
                var copyInitialNotebook = {
                    collection: notebook.collection.slice(),
                    fields: notebook.fields,
                    queriesForEnd: notebook.queriesForEnd
                };
                var currentNotebook = filter(copyInitialNotebook);
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
            var intersectionNotebook = {
                collection: notebook.collection.slice(),
                fields: notebook.fields,
                queriesForEnd: notebook.queriesForEnd
            };
            filters.forEach(function (filter) {
                intersectionNotebook = filter(intersectionNotebook);
            });

            return intersectionNotebook;
        };
    };
}
