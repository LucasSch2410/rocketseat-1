import AppError from "../utils/AppError.js";
import sqliteConnection from "../database/sqlite/index.js";
import pkg from 'bcryptjs';
const { hash, compare } = pkg;

export default class UsersController {
    // create(request, response){
    //     const { name, email, password } = request.body;

    //     //Verify error in the name
    //     if (!name){
    //         throw new AppError("Nome é obrigatório!");
    //     }      

    //     if (!email){
    //         throw new AppError("Email é obrigatório!");
    //     }

    //     response.status(201).json({ name, email, password });    
    // }


    async create(request, response, next) {
        try {
            const { name, email, password } = request.body;
            
            // Verify name and email
            if (!name) {
                throw new AppError("Nome é obrigatório!");
            }

            if (!email) {
                throw new AppError("Email é obrigatório!");
            }


            // Database connection and insert data
            const database = await sqliteConnection();
            const checkUserExists = await database.get("SELECT * FROM USERS WHERE email = (?)", [email]);

            if (checkUserExists){
                throw new AppError("Este e-mail já está em uso.");
            }

            const hashedPassword = await hash(password, 8);

            await database.run("INSERT INTO users (name, email, password) VALUES (?, ?, ?)", 
            [ name, email, hashedPassword ])

            response.status(201).json({ name, email, password });
            
        } catch (error) {
            next(error); // Envie o erro para o middleware de tratamento de erros
        }
    }

    async update (request, response, next){
    
        try {
            const { name, email, password, old_password } = request.body;

            const { id } = request.params;

            // Database connection 

            const database = await sqliteConnection();
            const user = await database.get("SELECT * FROM users WHERE id = ?", [id]);
    
            // User, email and password check 
            if(!user){
                throw new AppError("Usuário não encontrado.");
            } 

            if (password && !old_password) {
                throw new AppError("Você precisa informar a senha antiga para definir a nova senha.");
            }


            if (password && old_password){
                const checkOldPassword = await compare(old_password, user.password);

                if (!checkOldPassword){
                    throw new AppError ("A senha antiga não confere.");
                }

                user.password = await hash(password, 8)
            }
            
            const userWithUpdatedEmail = await database.get("SELECT * FROM users WHERE email = ?", [email]);
    
            if (userWithUpdatedEmail && userWithUpdatedEmail.id != user.id){
                throw new AppError("Este e-mail já está em uso.");

            }

            user.name = name ?? user.name;
            user.email = email ?? user.email;

            await database.run(`
                UPDATE users SET
                name = ?,
                email = ?, 
                password = ?,
                updated_at = DATETIME('now')
                WHERE id = ?`,
                [user.name, user.email, user.password, id]
            );

            return response.json();
        } catch (error) {
            next(error);
        }


    }
}
