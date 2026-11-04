export const calculatePagination = (page, limit, totalItems) => {
    const skip = (page - 1) * limit;
    const totalPages = Math.ceil(totalItems / limit);

    return {
        skip,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
    };
};