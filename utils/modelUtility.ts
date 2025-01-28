import mongoose, {
  FilterQuery,
  QueryOptions,
  UpdateQuery,
  Document,
  PopulateOptions,
} from "mongoose";

type IdType = mongoose.Types.ObjectId | string;
type PopulateType = string | PopulateOptions | (string | PopulateOptions)[];
type UpdateResult = mongoose.UpdateWriteOpResult; // Use UpdateWriteOpResult for updateMany results
type DeleteResult = { acknowledged: boolean; deletedCount: number };

// A utility function to apply population safely
function applyPopulate<T extends Document>(
  query: mongoose.Query<any, T>,
  populate?: PopulateType,
): mongoose.Query<any, T> {
  if (populate) {
    if (
      typeof populate === "string" ||
      (Array.isArray(populate) && populate.every((p) => typeof p === "string"))
    ) {
      return query.populate(populate as string | string[]);
    } else {
      return query.populate(
        populate as PopulateOptions | (string | PopulateOptions)[],
      );
    }
  }
  return query;
}

// Utility class to handle CRUD operations
class ModelUtils<T extends Document> {
  private model: mongoose.Model<T>;

  constructor(model: mongoose.Model<T>) {
    this.model = model;
  }

  // Create Operations
  createOne(data: Partial<T>): Promise<T> {
    return this.model.create(data);
  }

  createMany(data: Partial<T>[]): Promise<T[]> {
    return this.model.insertMany(data);
  }

  // Read Operations
  getById(id: IdType, populate?: PopulateType): Promise<T | null> {
    const query = this.model.findById(id);
    return applyPopulate(query, populate).exec();
  }

  getOne(filter: FilterQuery<T>, populate?: PopulateType): Promise<T | null> {
    const query = this.model.findOne(filter);
    return applyPopulate(query, populate).exec();
  }

  getAll(filter: FilterQuery<T> = {}, populate?: PopulateType): Promise<T[]> {
    const query = this.model.find(filter);
    return applyPopulate(query, populate).exec();
  }

  // const activities = await modelUtility.getAll(
  //   { vendor: vendorId },
  //   "vendor"  // This will handle population directly
  // );

  // // If you need to chain additional methods after getAll
  // const activitiesWithMorePopulation = await modelUtility.getAll(
  //   { vendor: vendorId },
  //   [{ path: 'vendor', select: 'name' }]  // Populate with options
  // ).then(activities => {
  //   return activities.populate('anotherField');  // Additional populate or other methods
  // });

  // Update Operations
  updateById(
    id: IdType,
    update: UpdateQuery<T>,
    options: QueryOptions = {},
  ): Promise<T | null> {
    return this.model
      .findByIdAndUpdate(id, update, { new: true, ...options })
      .exec();
  }

  updateOne(
    filter: FilterQuery<T>,
    update: UpdateQuery<T>,
    options: QueryOptions = {},
  ): Promise<T | null> {
    return this.model
      .findOneAndUpdate(filter, update, { new: true, ...options })
      .exec();
  }

  updateMany(
    filter: FilterQuery<T>,
    update: UpdateQuery<T>,
    options: QueryOptions = {},
  ): Promise<UpdateResult> {
    return this.model.updateMany(filter, update, options).exec();
  }

  // Delete Operations
  deleteById(id: IdType): Promise<T | null> {
    return this.model.findByIdAndDelete(id).exec();
  }

  deleteOne(filter: FilterQuery<T>): Promise<T | null> {
    return this.model.findOneAndDelete(filter).exec();
  }

  deleteMany(filter: FilterQuery<T>): Promise<DeleteResult> {
    return this.model.deleteMany(filter).exec();
  }
}

export default ModelUtils;
