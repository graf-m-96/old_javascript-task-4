'use strict';

/**
 * Сделано задание на звездочку
 * Реализованы методы or и and
 */
exports.isStar = true;


/**
 * Выполняем запросы относительно переданной колекции
 * @param {Object} notebook - {collection, fields, queriesForEnd}
 * @param {Array} queries
 * @returns {Object} notebook - после удаления полей, которые не вошли в select
 */
function doQueries(notebook, queries) {
    queries.forEach(function (query) {
        notebook = query(notebook);
    });

    return notebook;
}


/**
 * Создаёт коллекцию, элементы который имеют поля только находящиеся в select
 * @param {Object} notebook - {collection, fields, queriesForEnd}
 * @returns {Object} notebook - {collection, fields, queriesForEnd} после "удалени полей"
 */
function deleteFields(notebook) {
    if (notebook.fields !== undefined) {
        notebook.collection = notebook.collection.map(function (record) {
            var changedRecord = {};
            notebook.fields.forEach(function (field) {
                if (record.hasOwnProperty(field)) {
                    changedRecord[field] = record[field];
                }
            });

            return changedRecord;
        });
    }

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
        collection: collection.slice(),
        queriesForEnd: []
    };
    var queries = Array.from(arguments).slice(1);
    // запросы, которые выполняются немедленно
    notebook = doQueries(notebook, queries);
    // удаляем поля, которых нет в select
    notebook = deleteFields(notebook);
    // выполняем запросы, которые выполняются в конце
    notebook = doQueries(notebook, notebook.queriesForEnd);

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
        notebook.fields = notebook.fields !== undefined ? notebook.fields.filter(
            function (field) {
                return args.indexOf(field) !== -1;
            })
            : args;

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
 * Объединяет два массива во первый массив
 * @param {Array} commonCollection - общая коллекция
 * @param {Array} collection - коллекция, которую присоединяем к общей
 * @returns {Array} commonCollection - общая коллекция, объединённая с collection
 */
function union(commonCollection, collection) {
    collection.forEach(function (thisRecord) {
        if (!commonCollection.some(function (otherRecord) {
            return thisRecord === otherRecord;
        })) {
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
                var copyInitialNotebook = {
                    collection: notebook.collection.slice(),
                    fields: notebook.fields,
                    queriesForEnd: notebook.queriesForEnd
                };
                var currentNotebook = filter(copyInitialNotebook);
                unionNotebook.collection = union(unionNotebook.collection,
                                                 currentNotebook.collection);
            });


            unionNotebook.collection = notebook.collection.filter(function (record) {
                return unionNotebook.collection.indexOf(record) !== -1;
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
