export class ReglaNegocio extends Error {
  readonly codigo: number;

  constructor(mensaje: string, codigo = 400) {
    super(mensaje);
    this.name = "ReglaNegocio";
    this.codigo = codigo;
  }
}
