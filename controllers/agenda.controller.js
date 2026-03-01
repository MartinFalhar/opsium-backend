import { searchContactsFromDB } from "../models/agenda.model.js";
import { updateContactInDB } from "../models/agenda.model.js";
import { deleteContactInDB } from "../models/agenda.model.js";
import { getVatCurrent } from "../models/agenda.model.js";
import { getVatAtDate } from "../models/agenda.model.js";
import { searchForServicesFromDB } from "../models/agenda.model.js";
import { updateServicesInDB } from "../models/agenda.model.js";
import { deleteServicesInDB } from "../models/agenda.model.js";
import { getDashboardDataFromDB } from "../models/agenda.model.js";
import { searchTasksFromDB } from "../models/agenda.model.js";
import { createTaskInDB } from "../models/agenda.model.js";
import { updateTaskInDB } from "../models/agenda.model.js";
import { deleteTaskInDB } from "../models/agenda.model.js";

export async function searchContacts(req, res) {
  try {
    const clients = await searchContactsFromDB(req.body);
    if (clients && clients.length > 0) {
      res.json(clients);
      // message: "Nahrání proběhlo v pořádku"
    } else {
      res.json({ message: "Selhání při nahrávání kontaktů" });
    }
  } catch (error) {
    res.json({ success: false, message: "Chyba serveru" });
  }
}

export async function updateContacts(req, res) {
  try {
    const changedContact = req.body.changedContact;
    const organization_id = req.user.organization_id;

    const result = await updateContactInDB(changedContact, organization_id);

    if (result) {
      res.json(result);
    } else {
      res.json({ message: "Selhání při změně kontaktu." });
    }
  } catch (error) {
    res.json({ success: false, message: "Chyba serveru" });
  }
}

export async function deleteContacts(req, res) {
  try {
    const id = req.body.id;
    const organization_id = req.user.organization_id;

    const result = await deleteContactInDB(id, organization_id);

    if (result) {
      res.json(result);
    } else {
      res.json({ message: "Selhání při smazání kontaktu." });
    }
  } catch (error) {
    res.json({ success: false, message: "Chyba serveru" });
  }
}

export async function searchVatCurrent(req, res) {

  try {
    const vat = await getVatCurrent();

    res.json(vat);
  } catch (error) {
    res.json({ success: false, message: "Chyba serveru při načítání DPH" });
  }
}

export async function searchVatAtDate(req, res) {

  try {
    const vat = await getVatAtDate(req.query.date);
 
    res.json(vat);
  } catch (error) {
    res.json({ success: false, message: "Chyba serveru při načítání DPH" });
  }
}

export async function searchForServices(req, res) {

  try {
    // Přidáme branch_id z JWT tokenu
    const result = await searchForServicesFromDB({ branch_id: req.user.branch_id });

    if (result) {
      res.json(result);
      // message: "Nahrání proběhlo v pořádku"
    } else {
      res.json({ message: "Selhání při nahrávání služeb z katalogu." });
    }
  } catch (error) {
    res.json({ success: false, message: "Chyba serveru" });
  }
} 

export async function updateServices(req, res) {
  console.log("Received request to update services:", req.body.changedItem.plu);
  try {
    // Přidáme branch_id z JWT tokenu
    const result = await updateServicesInDB({ ...req.body.changedItem, branch_id: req.user.branch_id });

    if (result) {
      res.json(result);
      console.log("Services updated in controller:", result);
      // message: "Nahrání proběhlo v pořádku"
    } else {
      res.json({ message: "Selhání při změně služeb v katalogu." });
    }
  } catch (error) {
    res.json({ success: false, message: "Chyba serveru" });
  }
} 

export async function deleteServices(req, res) {
  console.log("Received request to delete service:", req.body.id);
 try {
    // branch_id nyní bereme z JWT tokenu
    const result = await deleteServicesInDB(req.body.id, req.user.branch_id);

    if (result) {
      res.json(result);
      console.log("Services deleted in controller:", result);
      // message: "Nahrání proběhlo v pořádku"
    } else {
      res.json({ message: "Selhání při změně služeb v katalogu." });
    }
  } catch (error) {
    res.json({ success: false, message: "Chyba serveru" });
  }
} 

export async function getDashboardData(req, res) {
  try {
    const branch_id = req.user.branch_id;
    const result = await getDashboardDataFromDB(branch_id);
    return res.json({ success: true, ...result });
  } catch (error) {
    console.error("Dashboard data load error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Chyba serveru při načítání dashboardu" });
  }
}

export async function searchTasks(req, res) {
  try {
    const result = await searchTasksFromDB(req.user.branch_id);
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ success: false, message: "Chyba serveru" });
  }
}

export async function createTask(req, res) {
  try {
    const taskPayload = {
      ...req.body,
      created_by: req.user.id,
      user_id: req.body.user_id ?? req.user.branch_id,
    };

    if (!taskPayload.title || !taskPayload.entity_type || !taskPayload.entity_id) {
      return res.status(400).json({ success: false, message: "Chybí povinná pole úkolu." });
    }

    const result = await createTaskInDB(taskPayload);
    return res.status(201).json(result);
  } catch (error) {
    return res.status(500).json({ success: false, message: "Chyba serveru" });
  }
}

export async function updateTask(req, res) {
  try {
    const taskPayload = {
      ...req.body,
      user_id: req.body.user_id ?? req.user.branch_id,
    };

    if (!taskPayload.id || !taskPayload.title || !taskPayload.entity_type || !taskPayload.entity_id) {
      return res.status(400).json({ success: false, message: "Chybí povinná pole úkolu." });
    }

    const result = await updateTaskInDB(taskPayload);
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ success: false, message: "Chyba serveru" });
  }
}

export async function deleteTask(req, res) {
  try {
    const result = await deleteTaskInDB(req.body.id);
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ success: false, message: "Chyba serveru" });
  }
}
