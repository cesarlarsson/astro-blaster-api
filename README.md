# Astro Blaster High Score API

Este proyecto es una API de Firebase Functions en Node.js con Express para gestionar puntajes altos de un juego. Utiliza Firestore para almacenar los puntajes de manera segura, sin requerir autenticación de usuarios reales.

## Características

- **Guardar/Actualizar Puntaje**: Los usuarios envían su puntaje con un ID único (hash). Solo se actualiza si es mejor que el anterior.
- **Obtener Ranking**: Devuelve el top 10 de puntajes ordenados por score descendente.
- **Seguridad**: Validación de inputs. No requiere cuentas de usuario, pero usa IDs únicos para evitar duplicados.

## Configuración de Firebase

1. **Instala Firebase CLI**:
   ```
   npm install -g firebase-tools
   ```

2. **Inicia sesión**:
   ```
   firebase login
   ```

3. **Crea un proyecto en Firebase Console**:
   - Ve a [Firebase Console](https://console.firebase.google.com/).
   - Crea un nuevo proyecto (ej: `astro-blaster-api`).
   - Habilita Firestore Database (elige "Modo de producción" o "Modo de prueba" para desarrollo).
   - No necesitas habilitar Authentication, ya que la API no la usa.

4. **Asocia el proyecto local**:
   - En el directorio del proyecto: `firebase use astro-blaster-api`
   - Esto actualiza `.firebaserc` con el project ID.

5. **Instala dependencias**:
   ```
   cd functions
   npm install
   ```

6. **Compila y despliega**:
   ```
   npm run build
   cd ..
   firebase deploy
   ```

## Endpoints

### POST /score
Envía o actualiza el puntaje de un usuario.

- **URL**: `https://us-central1-<PROJECT_ID>.cloudfunctions.net/api/score`
- **Método**: POST
- **Headers**: `Content-Type: application/json`
- **Body** (JSON):
  ```json
  {
    "userId": "string",  // ID único del usuario (hash del nombre + dispositivo)
    "userName": "string", // Nombre del usuario
    "score": number       // Puntaje (0-1000000)
  }
  ```
- **Respuesta exitosa**:
  ```json
  {
    "success": true
  }
  ```
- **Errores**:
  - 400: `Invalid score` o `Invalid userId` (si score no es número o userId no es string).
  - 500: Error interno.

**Notas**:
- Si el score es menor o igual al existente, no se actualiza.
- El `userId` debe ser único por usuario; genera un hash en la app.

### GET /ranking
Obtiene el ranking de los top 10 puntajes.

- **URL**: `https://us-central1-<PROJECT_ID>.cloudfunctions.net/api/ranking`
- **Método**: GET
- **Respuesta**:
  ```json
  [
    {
      "id": "userId",
      "score": 1500,
      "userName": "NombreUsuario"
    },
    ...
  ]
  ```

## Uso en Godot

En Godot, genera un `userId` único para cada usuario (ej: hash del nombre + OS.get_unique_id()).

### Ejemplo de envío de score:
```gdscript
extends Node

var http_request = HTTPRequest.new()

func _ready():
    add_child(http_request)
    http_request.connect("request_completed", self, "_on_request_completed")
    send_score("hash-del-nombre", "NombreUsuario", 1500)

func send_score(user_id: String, user_name: String, score: int):
    var url = "https://us-central1-astro-blaster-api.cloudfunctions.net/api/score"
    var data = {
        "userId": user_id,
        "userName": user_name,
        "score": score
    }
    var json = JSON.print(data)
    var headers = ["Content-Type: application/json"]
    http_request.request(url, headers, true, HTTPClient.METHOD_POST, json)

func _on_request_completed(result, response_code, headers, body):
    var response = JSON.parse(body.get_string_from_utf8()).result
    if response_code == 200 and response.success:
        print("Score enviado exitosamente")
    else:
        print("Error:", response_code, response)
```

### Ejemplo de obtener ranking:
```gdscript
func get_ranking():
    var url = "https://us-central1-astro-blaster-api.cloudfunctions.net/api/ranking"
    http_request.request(url, [], true, HTTPClient.METHOD_GET)

func _on_request_completed(result, response_code, headers, body):
    if response_code == 200:
        var ranking = JSON.parse(body.get_string_from_utf8()).result
        for entry in ranking:
            print(entry.userName, ": ", entry.score)
    else:
        print("Error al obtener ranking")
```

## Desarrollo Local

Para probar localmente:
1. `firebase emulators:start`
2. URLs locales: `http://localhost:5001/<PROJECT_ID>/us-central1/api/score`

## Notas de Seguridad

- Los puntajes se validan en el servidor para evitar valores inválidos.
- No hay autenticación, pero el `userId` único previene sobrescrituras accidentales.
- Firestore rules permiten lectura pública, pero escritura solo via functions.
- Para mayor seguridad, considera agregar rate limiting o validaciones adicionales.

## CI/CD

El proyecto incluye GitHub Actions para desplegar automáticamente al hacer push/merge a `master`.

### Configuración de GitHub Actions

1. **Obtén la Service Account de Firebase**:
   - Ve a [Firebase Console](https://console.firebase.google.com/) → Configuración del proyecto → Cuentas de servicio
   - Haz clic en "Generar nueva clave privada"
   - Descarga el archivo JSON

2. **Configura el secret en GitHub**:
   - Ve a tu repositorio en GitHub → Settings → Secrets and variables → Actions
   - Crea un nuevo secret llamado `FIREBASE_SERVICE_ACCOUNT`
   - Pega todo el contenido del archivo JSON descargado

3. **Workflow de deploy**:
   - Se ejecuta automáticamente al hacer push a la rama `master`
   - Instala dependencias, compila TypeScript y despliega las functions
   - Revisa el estado en la pestaña "Actions" de tu repositorio