import { Router, Request, Response } from 'express';
import EntityManager from '../models/entityManager';

export default class RouteManager {
    private router: Router;
    private entityManager: EntityManager;

    constructor(entityManager: EntityManager) {
        this.router = Router();
        this.entityManager = entityManager;
        this.setupEntityManagementRoutes();
    }

    private setupEntityManagementRoutes() {
        // Route to create new entity
        this.router.route('/entidades')
        .post( async (req: Request, res: Response) => {
            try {
                const entityDef = req.body;
                const model = await this.entityManager.createEntity(entityDef);
                this.createEntityRoutes(entityDef.name);
                res.status(201).json({ message: `Entidade ${entityDef.name} criada com sucesso` });
            } catch (error) {
                res.status(400).json({ error: (error as Error).message });
            }
        })
        .get( async (req: Request, res: Response) => {
            try {
                console.log("Buscando entidades no banco de dados");
                const entities = await this.entityManager.getAllEntityNames();
                if (!entities) {
                    console.log("Nenhuma entidade encontrada");
                    return;
                } 
                console.log("Entidades encontradas: ", entities);
                res.status(200).json({ entities });
            } catch (error) {
                res.status(500).json({ error: (error as Error).message });
            }
        });
        
    }

    public setupRoutesForExistingEntities() {
        const entityNames = this.entityManager.getAllEntityNames();
    
        entityNames.forEach((entityName) => {
            this.createEntityRoutes(entityName);
        });
    }

    private createEntityRoutes(entityName: string) {
        const entityRouter = Router();
        const model = this.entityManager.getModel(entityName);

        if (!model) return;

        entityRouter.get('/', async (req: Request, res: Response) => {
            try {
                const { fields, page, limit } = req.query;

                const projection = fields
                    ? (fields as string).split(',').reduce((acc, field) => {
                        acc[field.trim()] = 1;
                        return acc;
                    }, {} as Record<string, number>)
                    : {};

                    const pageNumber = parseInt(page as string) || 1;
                    const limitNumber = parseInt(limit as string) || 10;
                    const skip = (pageNumber - 1) * limitNumber;
                    console.log("Buscando documentos da entidade:", entityName);
                    const items = await model.find({}, projection).lean().skip(skip).limit(limitNumber);
            
                    const totalDocuments = await model.countDocuments();
            
                    res.json({
                        entityName,
                        totalDocuments,
                        currentPage: pageNumber,
                        totalPages: Math.ceil(totalDocuments / limitNumber),
                        items,
                    });
            } catch (error) {
                res.status(500).json({ error: (error as Error).message });
            }
        });

        // GET one with projection
        entityRouter.get('/:id', async (req: Request, res: Response): Promise<void> => {
            try {
                const { fields } = req.query;
                const projection = fields
                    ? (fields as string).split(',').reduce((acc, field) => {
                        acc[field.trim()] = 1;
                        return acc;
                    }, {} as Record<string, number>)
                    : {};

                const item = await model.findById(req.params.id, projection);
                if (!item) {
                    res.status(404).json({ error: 'Not found' });
                    return ;
                }
                res.json(item);
            } catch (error) {
                res.status(500).json({ error: (error as Error).message });
            }
        });

        // POST new item
        entityRouter.post('/', async (req: Request, res: Response) => {
            try {
                const item = new model(req.body);
                await item.save();
                res.status(201).json(item);
            } catch (error) {
                res.status(400).json({ error: (error as Error).message });
            }
        });

        // PUT/Update item
        entityRouter.put('/:id', async (req: Request, res: Response): Promise<void> => {
            try {
                const item = await model.findByIdAndUpdate(
                    req.params.id,
                    req.body,
                    { new: true, runValidators: true }
                );
                if (!item) {
                    res.status(404).json({ error: 'Not found' });
                    return;
                }
                res.json(item);
            } catch (error) {
                res.status(400).json({ error: (error as Error).message });
            }
        });

        // DELETE item
        entityRouter.delete('/:id', async (req: Request, res: Response): Promise<void> => {
            try {
                const item = await model.findByIdAndDelete(req.params.id);
                if (!item) {
                    res.status(404).json({ error: 'Not found' });
                    return;
                }
                res.status(204).send();
            } catch (error) {
                res.status(500).json({ error: (error as Error).message });
            }
        });

        // Mount the entity routes
        this.router.use(`/${entityName}`, entityRouter);
    }

    getRouter(): Router {
        return this.router;
    }
}