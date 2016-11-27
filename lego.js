'use strict';

/**
 * Сделано задание на звездочку
 * Реализованы методы or и and
 */
exports.isStar = true;


/**
 * @param {Array} collection - исходная коллекция
 * @param {Array} copyOfCollection - коллекция, в которую происходит копирование
 * @returns {Array} copyOfCollection - коллекция, полученная поверхностным копированием полей,
 * которые относятся к массиву (0, 1,..., n)
 */
function copyArray(collection, copyOfCollection) {
    // по умолчанию добавленные свойства не enumerable, так что тут только ключи массива
    copyOfCollection = collection.map(function (record) {

        return Object.assign({}, record);
    });

    return copyOfCollection;
}


/**
 * @param {Array} collection - исходная коллекция
 * @param {Array} copyOfCollection - коллекция, в которую происходит копирование
 * @returns {Array} copyOfCollection - коллекция, полученная поверхностным копированием полей,
 * относящуюся ко всей коллекции
 */
function copyFields(collection, copyOfCollection) {
    // fields
    if (collection.fields === undefined) {
        copyOfCollection.fields = undefined;
    } else {
        copyOfCollection.fields = collection.fields.slice();
    }
    // queriesForEnd
    // содержит объекты, но это не мешает, так как мы объекты не изменяем, а
    copyOfCollection.queriesForEnd = collection.queriesForEnd.slice();

    return copyOfCollection;
}


/**
 * @param {Array} collection - исходная коллекция
 * @returns {Array} copyOfCollection - коллекция, полученная поверхностным копированием
 * (массив + поля)
 */
function copyCollection(collection) {
    var copyOfCollection = copyArray(collection, []);

    return copyFields(collection, copyOfCollection);
}


/**
 * Выполнение запросов, которые выполняются немедленно
 * @param {Array} collection - исходная коллекция
 * @param {Array} queries - запросы
 * @returns {Array} collection - коллекция, которая прошла "немедленные" запросы, кроме запросов
 * типа формат
 */
function doImmediatelyRunningQueries(collection, queries) {
    // мы во всех запросах делаем копию, так что тут она не нужна
    queries.forEach(function (query) {
        collection = query(collection);
    });

    return collection;
}


/**
 * @param {Array} collection - исходная коллекция
 * @returns {Array} collection - коллекция, которая прошла запросы, которые выполняются в конца +
 * запросы типа format
 */
function doQueriesForEnd(collection) {
    collection = copyCollection(collection);
    // удаляем поля, которых не было в select
    collection.forEach(function (record) {
        Object.keys(record).forEach(function (field) {
            if (collection.fields.indexOf(field) === -1) {
                delete record[field];
            }
        });
    });
    collection.queriesForEnd.forEach(function (query) {
        collection = query(collection);
    });

    return collection;
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
    collection = collection.slice();
    collection.fields = undefined;
    collection.queriesForEnd = [];
    var queries = Array.from(arguments);
    queries.splice(0, 1);
    collection = doImmediatelyRunningQueries(collection, queries);
    collection = doQueriesForEnd(collection);
    delete collection.fields;
    delete collection.queriesForEnd;

    return collection;
};


/**
 * Выбор полей
 * @params {...String}
 * @returns {Function} - ищет пересечение полей и записывает их в поле fields (СТРУКТУРА!!!)
 */
exports.select = function () {
    var args = Array.from(arguments);

    return function (collection) {
        collection = copyCollection(collection);
        if (collection.fields === undefined) {
            collection.fields = args;
        } else {
            collection.fields = collection.fields.filter(function (field) {
                return args.indexOf(field) !== -1;
            });
        }

        return collection;
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

    return function (collection) {
        collection = copyCollection(collection);

        var array = collection.filter(function (record) {
            return values.indexOf(record[property]) !== -1;
        });

        return copyFields(collection, array);
    };
};


/**
 * Сортировка коллекции по полю
 * @param {String} property – Свойство для фильтрации
 * @param {String} order – Порядок сортировки (asc - по возрастанию; desc – по убыванию)
 * @returns {Function} - сортирует коллекцию по заданному правилу
 */
exports.sortBy = function (property, order) {
    console.info(property, order);
    var orderToFactor = { asc: 1, desc: -1 };

    return function (collection) {
        collection = copyCollection(collection);
        collection.sort(function (thisRecord, otherRecord) {
            if (orderToFactor[order] * thisRecord[property] < orderToFactor[order] *
                                                             otherRecord[property]) {
                return -1;
            }
            if (orderToFactor[order] * thisRecord[property] > orderToFactor[order] *
                                                              otherRecord[property]) {
                return 1;
            }

            return 0;
        });

        return collection;
    };
};


/**
 * Форматирование поля
 * @param {String} property – Свойство для фильтрации
 * @param {Function} formatter – Функция для форматирования
 * @returns {Function} - добавляет в поле queriesForEnd (СТРУКТУРА!!!) функцию, которая должна
 * выполняться в конце
 */
exports.format = function (property, formatter) {
    console.info(property, formatter);

    return function (collection) {
        collection = copyCollection(collection);
        collection.queriesForEnd.push(function (changedCollection) {
            changedCollection = copyCollection(changedCollection);
            changedCollection.forEach(function (record) {
                if (record.hasOwnProperty(property)) {
                    record[property] = formatter(record[property]);
                }
            });

            return changedCollection;
        });

        return collection;
    };
};


/**
 * Ограничение количества элементов в коллекции
 * @param {Number} count – Максимальное количество элементов
 * @returns {Function} - добавляет в поле queriesForEnd (СТРУКТУРА!!!) функцию, которая должна
 * выполняться в конце
 */
exports.limit = function (count) {
    console.info(count);

    return function (collection) {
        collection = copyCollection(collection);
        collection.queriesForEnd.push(function (changedCollection) {
            changedCollection = copyCollection(changedCollection);

            return changedCollection.slice(0, count);
        });

        return collection;
    };
};

/**
 * @param {Array} commonCollection - общая коллекция
 * @param {Array} collection - коллекция, которую присоединяем к общей
 * @returns {Array} commonCollection - общая коллекция, объединённая с collection
 */
function union(commonCollection, collection) {

    /*
    так как мы сами объекты не меняем, а только работаем с массивом (добавляем туда элементы),
    то можно сравнивать объекты по ссылке
     */
    collection.forEach(function (record) {
        if (commonCollection.indexOf(record) === -1) {
            commonCollection.push(record);
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

        return function (collection) {
            var initialCollection = copyCollection(collection);
            var commonCollection = [];
            filters.forEach(function (filter) {
                collection = filter(initialCollection);
                commonCollection = union(commonCollection, collection);
            });

            return copyFields(initialCollection, commonCollection);
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

        return function (collection) {
            var initialCollection = copyCollection(collection);
            filters.forEach(function (filter) {
                collection = filter(collection);
            });

            return copyFields(initialCollection, collection);
        };
    };
}
